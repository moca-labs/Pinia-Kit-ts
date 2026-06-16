import { McStore } from '@moca-labs/pinia-kit-ts'

export class ThemeState {
	private _theme: 'light' | 'dark' = 'light'
	language: string = 'ko'
	fontSize: number = 14

	// getter + setter (setter에서 DOM side effect)
	get theme(): 'light' | 'dark' {
		return this._theme
	}
	set theme(value: 'light' | 'dark') {
		console.log(`[ThemeStore] theme setter 호출: "${this._theme}" → "${value}"`)
		this._theme = value
		document.documentElement.setAttribute('data-theme', value)
	}

	// getter only
	get isDarkMode(): boolean {
		return this._theme === 'dark'
	}

	toggleTheme(): void {
		this.theme = this._theme === 'light' ? 'dark' : 'light'
	}

	setFontSize(size: number): void {
		this.fontSize = size
	}
}

export const useThemeStore = () => McStore('theme', ThemeState)
