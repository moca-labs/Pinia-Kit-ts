import type { Pinia } from "pinia";
import { defineStore, setActivePinia } from "pinia";
import type { App } from "vue";
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

		const getters: Record<string, (this: object) => unknown> = {};
		const actions: Record<string, (...args: unknown[]) => unknown> = {};

		for (const prop of Object.getOwnPropertyNames(proto)) {
			if (prop === "constructor") continue;
			const descriptor = Object.getOwnPropertyDescriptor(proto, prop);
			if (!descriptor) continue;
			if (descriptor.get) {
				const get = descriptor.get;
				getters[prop] = function (this: object) {
					return get.call(this);
				};
			} else if (typeof descriptor.value === "function") {
				actions[prop] = descriptor.value as (...args: unknown[]) => unknown;
			}
		}

		actions.reset = function (this: { $reset(): void }) {
			this.$reset();
		};

		actions.undefine = function (this: { $id: string; $dispose(): void }) {
			this.$dispose();
			registry.delete(this.$id);
		};

		const useStore = defineStore(key, {
			state: (): Record<string, unknown> => {
				const s: Record<string, unknown> = {};
				for (const [k, v] of Object.entries(initialState)) {
					try {
						s[k] = structuredClone(v);
					} catch {
						s[k] = v;
					}
				}
				return s;
			},
			// biome-ignore lint/suspicious/noExplicitAny: Pinia 내부 타입과 병합 필요
			getters: getters as any,
			// biome-ignore lint/suspicious/noExplicitAny: Pinia 내부 타입과 병합 필요
			actions: actions as any,
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
