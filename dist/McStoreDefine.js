import { defineStore } from "pinia";
import { isReactive, isRef, toRaw } from "vue";
const snapshotValue = (value) => {
    try {
        return structuredClone(toRaw(value));
    }
    catch {
        return value;
    }
};
const restoreValue = (current, snapshot) => {
    if (isRef(current)) {
        try {
            current.value = structuredClone(snapshot);
        }
        catch {
            current.value = snapshot;
        }
    }
    else if (isReactive(current)) {
        try {
            Object.assign(current, structuredClone(snapshot));
        }
        catch {
            Object.assign(current, snapshot);
        }
    }
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
export function defineMcStore(id, setup) {
    return defineStore(id, () => {
        const result = setup();
        const initSnapshot = new Map();
        for (const [key, value] of Object.entries(result)) {
            if (isRef(value)) {
                initSnapshot.set(key, snapshotValue(value.value));
            }
            else if (isReactive(value)) {
                initSnapshot.set(key, snapshotValue(value));
            }
        }
        const $reset = () => {
            for (const [key, snapshot] of initSnapshot) {
                restoreValue(result[key], snapshot);
            }
        };
        return { ...result, $reset };
    });
}
/**
 * 페이지 단위 스토어 정의 - 라우트 이탈 시 $reset() 호출을 권장합니다.
 *
 * @example
 * // 페이지 컴포넌트 onUnmounted 에서 호출
 * onUnmounted(() => store.$reset())
 */
export const definePageStore = defineMcStore;
