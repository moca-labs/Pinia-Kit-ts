import { type Pinia } from "pinia";
export declare class McStoreManager {
    private static _pinia;
    /**
     * Pinia 인스턴스를 등록합니다. main.ts 에서 app.use(pinia) 직후 호출하세요.
     *
     * @example
     * const pinia = createPinia()
     * app.use(pinia)
     * McStoreManager.install(pinia)
     */
    static install(pinia: Pinia): void;
    /**
     * Vue setup() 컨텍스트 밖에서도 스토어를 안전하게 사용합니다.
     * McAxiosManager.getMcAxios() 와 동일한 패턴입니다.
     *
     * @example
     * McStoreManager.use(useAppStore).setLoading(true)
     * McStoreManager.use(usePopupStore).open({ title: '확인' })
     */
    static use<T>(storeHook: (pinia?: Pinia) => T): T;
    static getPinia(): Pinia | null;
}
