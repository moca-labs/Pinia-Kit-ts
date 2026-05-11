export type McStoreWithReset<T> = T & {
    $reset: () => void;
};
/**
 * defineStore 래퍼 - setup store 에 $reset() 을 자동으로 추가합니다.
 * Pinia 옵션 스토어에는 기본 제공되지만 setup 스토어에는 없는 기능입니다.
 *
 * @example
 * export const useAppStore = defineMcStore('app', () => {
 *   const isLoading = ref(false)
 *   const userToken = ref('')
 *
 *   const setLoading = (v: boolean) => { isLoading.value = v }
 *   return { isLoading, userToken, setLoading }
 * })
 *
 * // 사용
 * const store = useAppStore()
 * store.$reset() // 초기 상태로 복원
 */
export declare function defineMcStore<T extends Record<string, unknown>>(id: string, setup: () => T): import("pinia").StoreDefinition<string, import("pinia")._ExtractStateFromSetupStore<McStoreWithReset<T>>, import("pinia")._ExtractGettersFromSetupStore<McStoreWithReset<T>>, import("pinia")._ExtractActionsFromSetupStore<McStoreWithReset<T>>>;
/**
 * 페이지 단위 스토어 정의 - 라우트 이탈 시 $reset() 호출을 권장합니다.
 *
 * @example
 * // 페이지 컴포넌트 onUnmounted 에서 호출
 * onUnmounted(() => store.$reset())
 */
export declare const definePageStore: typeof defineMcStore;
