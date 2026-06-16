import { McStore } from '@moca-labs/pinia-kit-ts'

export class TabMenuStatusState {
	tabShow: string = 'N'
	oldTabValue: string = ''
	tabValue: string = ''
	subTabValue: string = ''
	tabSubValue: number = 0
	moreSearchYn: boolean = true
	noticeYn: boolean = false

	mutationTabShow(payload: string): void {
		this.tabShow = payload
	}

	// 내부에서 this.mutationTabShow를 호출 — 수정 전 버그 재현 케이스
	actionTabShow(payload: string): void {
		this.mutationTabShow(payload)
	}

	mutationTabValue(payload: string): void {
		this.oldTabValue = this.tabValue
		this.tabValue = payload
	}

	actionTabValue(payload: string): void {
		this.mutationTabValue(payload)
	}
}

export const useTabMenuStatusStore = () => McStore('tabMenuStatus', TabMenuStatusState)
