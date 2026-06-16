import { McStore } from '@moca-labs/pinia-kit-ts'

// setter만 있는 엣지케이스 테스트
export class WriteOnlyState {
	_log: string[] = []

	// setter only (getter 없음)
	set lastMessage(value: string) {
		console.log(`[WriteOnlyStore] lastMessage setter 호출: "${value}"`)
		this._log.push(`[${new Date().toLocaleTimeString()}] ${value}`)
	}

	// 일반 getter (log 읽기)
	get history(): string[] {
		return [...this._log]
	}

	clear(): void {
		this._log = []
	}
}

export const useWriteOnlyStore = () => McStore('writeOnly', WriteOnlyState)
