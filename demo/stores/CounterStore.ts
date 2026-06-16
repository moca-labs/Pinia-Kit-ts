import { McStore } from '@moca-labs/pinia-kit-ts'

export class CounterState {
	count: number = 0
	step: number = 1

	// getter only
	get doubled(): number {
		return this.count * 2
	}

	get label(): string {
		return `count=${this.count}, doubled=${this.count * 2}`
	}

	increment(): void {
		this.count += this.step
	}

	decrement(): void {
		this.count -= this.step
	}

	setStep(value: number): void {
		this.step = value
	}
}

export const useCounterStore = () => McStore('counter', CounterState)
