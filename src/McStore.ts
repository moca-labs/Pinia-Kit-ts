import type { Pinia } from "pinia";
import { defineStore, setActivePinia } from "pinia";
import type { App } from "vue";
import { McStoreManager } from "./McStoreManager";

type Constructor<T extends object> = new () => T;
type McStoreInstance<T> = T & { reset(): void; undefine(): void };

const _registry = new Map<string, (pinia?: Pinia) => object>();

function _define<T extends object>(key: string, ctor: Constructor<T>): void {
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

	// 상태를 초기값으로 복원
	actions.reset = function (this: { $reset(): void }) {
		this.$reset();
	};

	// Pinia + registry에서 완전 제거, 이후 재접근 시 새로 생성
	actions.undefine = function (this: { $id: string; $dispose(): void }) {
		this.$dispose();
		_registry.delete(this.$id);
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

	_registry.set(key, useStore);
}

/**
 * store를 반환합니다. 등록되어 있지 않으면 자동으로 등록 후 반환합니다.
 * setup() 안팎 어디서든 사용 가능합니다.
 *
 * @example
 * // <script setup>
 * const user = McStore("user", UserStore)
 * user.reset()     // 초기값으로 상태 복원
 * user.undefine()  // Pinia + registry에서 완전 제거
 *
 * // setup() 밖 (interceptor, router guard 등)
 * McStore("user", UserStore).logout()
 */
function McStore<T extends object>(
	key: string,
	ctor: Constructor<T>,
): McStoreInstance<T> {
	if (!_registry.has(key)) {
		_define(key, ctor);
	}
	const hook = _registry.get(key);
	if (!hook) {
		throw new Error(`[McStore] '${key}' store 생성에 실패했습니다.`);
	}
	const pinia = McStoreManager.getPinia() ?? undefined;
	return hook(pinia) as McStoreInstance<T>;
}

namespace McStore {
	/**
	 * store를 명시적으로 사전 등록합니다.
	 * 앱 초기화 시점에 미리 등록해두고 싶을 때 사용합니다.
	 *
	 * @example
	 * // main.ts 또는 stores/index.ts
	 * McStore.define("user", UserStore)
	 * McStore.define("cart", CartStore)
	 */
	export function define<T extends object>(
		key: string,
		ctor: Constructor<T>,
	): void {
		if (!_registry.has(key)) {
			_define(key, ctor);
		}
	}

	/**
	 * 해당 store가 등록되어 있는지 확인합니다.
	 */
	export function has(key: string): boolean {
		return _registry.has(key);
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
	export function create(pinia: Pinia): { install(app: App): void } {
		McStoreManager._pinia = pinia;
		return {
			install(app: App) {
				app.use(pinia);
				setActivePinia(pinia);
			},
		};
	}
}

export { McStore };
