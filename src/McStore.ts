import type { Pinia } from "pinia";
import { defineStore, setActivePinia } from "pinia";
import type { App } from "vue";
import { computed, reactive, toRef } from "vue";
import { McStoreManager } from "./McStoreManager";

type Constructor<T extends object> = new () => T;
type McStoreInstance<T> = T & { reset(): void; undefine(): void };

interface McStoreFunction {
	<T extends object>(key: string, ctor: Constructor<T>): McStoreInstance<T>;
	use<T extends object>(key: string, ctor: Constructor<T>): McStoreInstance<T>;
	define<T extends object>(key: string, ctor: Constructor<T>): void;
	undefine(key: string): void;
	has(key: string): boolean;
	create(pinia: Pinia): { install(app: App): void };
}

class McStoreImpl {
	private readonly registry = new Map<string, (pinia?: Pinia) => object>();

	private _define<T extends object>(key: string, ctor: Constructor<T>): void {
		const registry = this.registry;
		const proto = ctor.prototype as Record<string, unknown>;
		const instance = new ctor();

		const initialState: Record<string, unknown> = {};
		for (const prop of Object.keys(instance)) {
			const val = (instance as Record<string, unknown>)[prop];
			try {
				initialState[prop] = structuredClone(val);
			} catch {
				initialState[prop] = val;
			}
		}

		const getterMap: Record<string, () => unknown> = {};
		const setterMap: Record<string, (v: unknown) => void> = {};
		const methodMap: Record<string, (...args: unknown[]) => unknown> = {};

		for (const prop of Object.getOwnPropertyNames(proto)) {
			if (prop === "constructor") continue;
			const descriptor = Object.getOwnPropertyDescriptor(proto, prop);
			if (!descriptor) continue;
			if (descriptor.get) getterMap[prop] = descriptor.get;
			if (descriptor.set)
				setterMap[prop] = descriptor.set as (v: unknown) => void;
			if (
				!descriptor.get &&
				!descriptor.set &&
				typeof descriptor.value === "function"
			) {
				methodMap[prop] = descriptor.value as (...args: unknown[]) => unknown;
			}
		}

		// Setup store API를 사용해 writable computed를 통해 getter/setter를 처리합니다.
		// Options API는 action 내부에서 this가 Pinia store에 rebind되어
		// this.prop = value 가 readonly computed에 막히는 문제가 있습니다.
		const useStore = defineStore(key, () => {
			const stateClone: Record<string, unknown> = {};
			for (const [k, v] of Object.entries(initialState)) {
				try {
					stateClone[k] = structuredClone(v);
				} catch {
					stateClone[k] = v;
				}
			}
			const state = reactive(stateClone);

			// ctx는 모든 클래스 메서드/getter/setter에서 this로 사용됩니다.
			// get/set을 가로채 getterMap/setterMap을 경유합니다.
			const ctx = new Proxy(state as Record<string, unknown>, {
				get(target, k) {
					const key = String(k);
					if (key in getterMap) return getterMap[key].call(ctx);
					return target[key];
				},
				set(target, k, value) {
					const key = String(k);
					if (key in setterMap) {
						setterMap[key].call(ctx, value);
						return true;
					}
					target[key] = value;
					return true;
				},
			});

			// biome-ignore lint/suspicious/noExplicitAny: Pinia setup store 반환 타입
			const result: Record<string, any> = {};

			// 상태 프로퍼티를 ref로 노출 (Pinia가 상태로 인식)
			for (const k of Object.keys(initialState)) {
				result[k] = toRef(state as Record<string, unknown>, k);
			}

			// getter/setter를 computed로 노출
			const accessorProps = new Set([
				...Object.keys(getterMap),
				...Object.keys(setterMap),
			]);
			for (const prop of accessorProps) {
				const hasGet = prop in getterMap;
				const hasSet = prop in setterMap;

				if (hasGet && hasSet) {
					// 양방향 computed: store.prop = value 가 ctx → setter 경유
					result[prop] = computed({
						get: () => getterMap[prop].call(ctx),
						set: (value: unknown) => setterMap[prop].call(ctx, value),
					});
				} else if (hasGet) {
					result[prop] = computed(() => getterMap[prop].call(ctx));
				} else {
					// setter only: get은 undefined, set만 동작
					result[prop] = computed({
						get: () => undefined,
						set: (value: unknown) => setterMap[prop].call(ctx, value),
					});
				}
			}

			// 메서드: ctx를 this로 바인딩해 호출
			for (const [prop, method] of Object.entries(methodMap)) {
				result[prop] = (...args: unknown[]) => method.apply(ctx, args);
			}

			result.reset = () => {
				for (const [k, v] of Object.entries(initialState)) {
					try {
						(state as Record<string, unknown>)[k] = structuredClone(v);
					} catch {
						(state as Record<string, unknown>)[k] = v;
					}
				}
			};

			result.undefine = () => {
				const hook = registry.get(key);
				if (!hook) return;
				const pinia = McStoreManager.getPinia() ?? undefined;
				(hook(pinia) as { $dispose(): void }).$dispose();
				registry.delete(key);
			};

			return result;
		});

		registry.set(key, useStore);
	}

	/**
	 * store를 반환합니다. 등록되어 있지 않으면 자동으로 등록 후 반환합니다.
	 * setup() 안팎 어디서든 사용 가능합니다.
	 *
	 * @example
	 * // <script setup>
	 * const user = McStore.use("user", UserStore)
	 * user.reset()     // 초기값으로 상태 복원
	 * user.undefine()  // Pinia + registry에서 완전 제거
	 *
	 * // setup() 밖 (interceptor, router guard 등)
	 * McStore.use("user", UserStore).logout()
	 */
	public use<T extends object>(
		key: string,
		ctor: Constructor<T>,
	): McStoreInstance<T> {
		if (!this.registry.has(key)) {
			this._define(key, ctor);
		}
		const hook = this.registry.get(key);
		if (!hook) {
			throw new Error(`[McStore] Failed to create store '${key}'.`);
		}
		const pinia = McStoreManager.getPinia() ?? undefined;
		return hook(pinia) as McStoreInstance<T>;
	}

	/**
	 * store를 명시적으로 사전 등록합니다.
	 * 앱 초기화 시점에 미리 등록해두고 싶을 때 사용합니다.
	 *
	 * @example
	 * // main.ts 또는 stores/index.ts
	 * McStore.define("user", UserStore)
	 * McStore.define("cart", CartStore)
	 */
	public define<T extends object>(key: string, ctor: Constructor<T>): void {
		if (!this.registry.has(key)) {
			this._define(key, ctor);
		}
	}

	/**
	 * store를 Pinia + registry에서 완전 제거합니다.
	 * 이후 재접근 시 새로 생성됩니다.
	 *
	 * @example
	 * McStore.undefine("user")
	 */
	public undefine(key: string): void {
		const hook = this.registry.get(key);
		if (!hook) return;
		const pinia = McStoreManager.getPinia() ?? undefined;
		const store = hook(pinia) as { $dispose(): void };
		store.$dispose();
		this.registry.delete(key);
	}

	/**
	 * 해당 store가 등록되어 있는지 확인합니다.
	 */
	public has(key: string): boolean {
		return this.registry.has(key);
	}

	/**
	 * Pinia 인스턴스를 받아 McStore에 등록하고 Vue 플러그인을 반환합니다.
	 *
	 * @example
	 * // main.ts
	 * app.use(McStore.create(createPinia()))
	 *
	 * // Pinia 플러그인이 필요한 경우
	 * const pinia = createPinia()
	 * pinia.use(piniaPluginPersistedstate)
	 * app.use(McStore.create(pinia))
	 */
	public create(pinia: Pinia): { install(app: App): void } {
		McStoreManager.setPinia(pinia);
		return {
			install(app: App) {
				app.use(pinia);
				setActivePinia(pinia);
			},
		};
	}
}

const McStore: McStoreFunction = (() => {
	const impl = new McStoreImpl();

	function mcStore<T extends object>(
		key: string,
		ctor: Constructor<T>,
	): McStoreInstance<T> {
		return impl.use(key, ctor);
	}

	mcStore.use = impl.use.bind(impl);
	mcStore.define = impl.define.bind(impl);
	mcStore.undefine = impl.undefine.bind(impl);
	mcStore.has = impl.has.bind(impl);
	mcStore.create = impl.create.bind(impl);

	return mcStore;
})();

export { McStore };
