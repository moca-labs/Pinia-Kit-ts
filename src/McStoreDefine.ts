import { defineStore } from "pinia";
import { isReactive, isRef, toRaw, type Ref } from "vue";

export type McStoreWithReset<T> = T & { $reset: () => void };

const snapshotValue = (value: unknown): unknown => {
	try {
		return structuredClone(toRaw(value as object));
	} catch {
		return value;
	}
};

const restoreValue = (current: unknown, snapshot: unknown): void => {
	if (isRef(current as Ref)) {
		try {
			(current as Ref).value = structuredClone(snapshot);
		} catch {
			(current as Ref).value = snapshot;
		}
	} else if (isReactive(current)) {
		try {
			Object.assign(current as object, structuredClone(snapshot));
		} catch {
			Object.assign(current as object, snapshot);
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
export function defineMcStore<T extends Record<string, unknown>>(
	id: string,
	setup: () => T,
) {
	return defineStore(id, (): McStoreWithReset<T> => {
		const result = setup();

		const initSnapshot = new Map<string, unknown>();
		for (const [key, value] of Object.entries(result)) {
			if (isRef(value as Ref)) {
				initSnapshot.set(key, snapshotValue((value as Ref).value));
			} else if (isReactive(value)) {
				initSnapshot.set(key, snapshotValue(value));
			}
		}

		const $reset = (): void => {
			for (const [key, snapshot] of initSnapshot) {
				restoreValue((result as Record<string, unknown>)[key], snapshot);
			}
		};

		return { ...result, $reset } as McStoreWithReset<T>;
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
