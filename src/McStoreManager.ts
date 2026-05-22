import type { Pinia } from "pinia";
import { getActivePinia } from "pinia";

export class McStoreManager {
	static _pinia: Pinia | null = null;

	private constructor() {}

	/**
	 * McStore.define() 으로 등록되지 않은 기존 Pinia store를
	 * setup() 컨텍스트 밖에서 사용할 때 씁니다.
	 *
	 * @example
	 * McStoreManager.use(useAppStore).setLoading(true)
	 */
	static use<T>(storeHook: (pinia?: Pinia) => T): T {
		const pinia = McStoreManager._pinia ?? getActivePinia();
		if (!pinia) {
			throw new Error(
				"[McStoreManager] Pinia 인스턴스를 찾을 수 없습니다. main.ts 에서 McStore.create() 를 사용하세요.",
			);
		}
		return storeHook(pinia);
	}

	static getPinia(): Pinia | null {
		return McStoreManager._pinia ?? getActivePinia() ?? null;
	}
}
