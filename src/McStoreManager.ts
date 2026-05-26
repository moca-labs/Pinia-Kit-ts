import type { Pinia } from "pinia";
import { getActivePinia } from "pinia";

export class McStoreManager {
	private static pinia: Pinia | null = null;

	private constructor() {}

	public static setPinia(pinia: Pinia): void {
		McStoreManager.pinia = pinia;
	}

	public static getPinia(): Pinia | null {
		return McStoreManager.pinia ?? getActivePinia() ?? null;
	}

	/**
	 * McStore.define() 으로 등록되지 않은 기존 Pinia store를
	 * setup() 컨텍스트 밖에서 사용할 때 씁니다.
	 *
	 * @example
	 * McStoreManager.use(useAppStore).setLoading(true)
	 */
	public static use<T>(storeHook: (pinia?: Pinia) => T): T {
		const pinia = McStoreManager.pinia ?? getActivePinia();
		if (!pinia) {
			throw new Error(
				"[McStoreManager] No Pinia instance found. Call McStore.create() in main.ts.",
			);
		}
		return storeHook(pinia);
	}
}
