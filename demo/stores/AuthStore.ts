import { McStore } from '@moca-labs/pinia-kit-ts'

export class AuthState {
	private _token: string = ''
	username: string = ''
	loginCount: number = 0

	// getter + setter 쌍
	get token(): string {
		return this._token
	}
	set token(value: string) {
		console.log(`[AuthStore] token setter 호출: "${this._token}" → "${value}"`)
		this._token = value
		// 실제 프로젝트에서는 여기서 헤더 갱신 등 side effect 처리
	}

	// getter only (computed)
	get isLoggedIn(): boolean {
		return this._token !== ''
	}

	get maskedToken(): string {
		if (!this._token) return '(없음)'
		return this._token.slice(0, 4) + '****'
	}

	login(username: string, token: string): void {
		this.username = username
		this.token = token // setter 경유
		this.loginCount++
	}

	logout(): void {
		this.username = ''
		this.token = '' // setter 경유
	}
}

export const useAuthStore = () => McStore('auth', AuthState)
