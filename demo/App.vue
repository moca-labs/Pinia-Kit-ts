<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { McStore } from '@moca-labs/pinia-kit-ts'
import { CounterState, useCounterStore } from './stores/CounterStore'
import { useAuthStore } from './stores/AuthStore'
import { useThemeStore } from './stores/ThemeStore'
import { WriteOnlyState, useWriteOnlyStore } from './stores/WriteOnlyStore'
import { useTabMenuStatusStore } from './stores/TabMenuStatusStore'

const counter = useCounterStore()
const auth = useAuthStore()
const theme = useThemeStore()
const writeOnly = useWriteOnlyStore()
const tabMenu = useTabMenuStatusStore()

// ── 로그 패널 ──────────────────────────────────────────────
const consoleLogs = ref<string[]>([])
const appendLog = (msg: string) =>
	consoleLogs.value.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`)

const origLog = console.log
console.log = (...args: unknown[]) => {
	origLog(...args)
	appendLog(args.map(String).join(' '))
}
onUnmounted(() => { console.log = origLog })

// ── 1. CounterStore ────────────────────────────────────────
const stepInput = ref(counter.step)
function applyStep() {
	counter.setStep(stepInput.value)
	appendLog(`counter.setStep(${stepInput.value})`)
}
function resetCounter() {
	counter.reset()
	stepInput.value = 1
	appendLog('counter.reset() → 초기값 복원')
}

// ── 2. AuthStore ───────────────────────────────────────────
const loginUser = ref('홍길동')
const loginToken = ref('tok_abc123')
function doLogin() {
	auth.login(loginUser.value, loginToken.value)
}
function doLogout() {
	auth.logout()
}
function setTokenDirectly() {
	auth.token = 'manual_xyz'
	appendLog("auth.token = 'manual_xyz'  ← setter 직접 할당")
}

// ── 3. ThemeStore ──────────────────────────────────────────
function setTheme(val: 'light' | 'dark') {
	theme.theme = val
}

// ── 4. WriteOnlyStore (setter only) ───────────────────────
const writeMsg = ref('Hello McStore!')
function sendMessage() {
	writeOnly.lastMessage = writeMsg.value
	appendLog(`writeOnly.lastMessage = "${writeMsg.value}"  ← setter only 할당`)
}

// ── 5. McStore API 기능 ────────────────────────────────────
const hasResults = ref<Record<string, boolean>>({})
function checkHas() {
	hasResults.value = {
		counter: McStore.has('counter'),
		auth: McStore.has('auth'),
		theme: McStore.has('theme'),
		writeOnly: McStore.has('writeOnly'),
		notExist: McStore.has('notExist'),
	}
	appendLog('McStore.has() 결과 갱신')
}

// McStore.define() 사전 등록
class NotifState {
	enabled: boolean = true
	sound: boolean = false
}
function preDefine() {
	McStore.define('notif', NotifState)
	appendLog('McStore.define("notif", NotifState) → 사전 등록 완료')
	checkHas()
}

// undefine
function undefineCounter() {
	counter.undefine()
	appendLog('counter.undefine() → Pinia + registry에서 제거됨')
	checkHas()
}
function redefineCounter() {
	useCounterStore()
	appendLog('useCounterStore() 재호출 → 자동 재등록')
	checkHas()
}

// ── 6. 메서드 간 this 호출 (버그 수정 검증) ───────────────
const tabShowInput = ref('Y')
const tabValueInput = ref('TAB_A')
const tabCallError = ref<string | null>(null)

function callActionTabShow() {
	tabCallError.value = null
	try {
		tabMenu.actionTabShow(tabShowInput.value)
		appendLog(`tabMenu.actionTabShow("${tabShowInput.value}") → tabShow=${tabMenu.tabShow}`)
	} catch (e) {
		tabCallError.value = String(e)
		appendLog(`[ERROR] ${e}`)
	}
}
function callActionTabValue() {
	tabCallError.value = null
	try {
		tabMenu.actionTabValue(tabValueInput.value)
		appendLog(`tabMenu.actionTabValue("${tabValueInput.value}") → tabValue=${tabMenu.tabValue}, oldTabValue=${tabMenu.oldTabValue}`)
	} catch (e) {
		tabCallError.value = String(e)
		appendLog(`[ERROR] ${e}`)
	}
}

// ── 7. setup() 밖 호출 시뮬레이션 ─────────────────────────
function callOutsideSetup() {
	// Vue setup() 없이도 McStore('key', Class) 로 바로 접근 가능
	const c = McStore('counter', CounterState)
	appendLog(`[setup 밖] counter.count=${c.count}, doubled=${c.doubled}`)
	const wo = McStore('writeOnly', WriteOnlyState)
	appendLog(`[setup 밖] writeOnly._log.length=${wo._log.length}`)
}
</script>

<template>
	<div :class="['app', theme.isDarkMode ? 'dark' : 'light']">
		<header>
			<h1>McStore Demo</h1>
			<span class="version">@moca-labs/pinia-kit-ts</span>
		</header>

		<div class="grid">

			<!-- ── 1. 기본 state + getter only + 메서드 ── -->
			<section>
				<h2>1. CounterStore</h2>
				<p class="desc">기본 state, getter only (doubled, label), 메서드</p>
				<div class="state-box">
					<div class="row"><span>count</span><strong>{{ counter.count }}</strong></div>
					<div class="row"><span>step</span><strong>{{ counter.step }}</strong></div>
					<div class="row"><span>doubled <small>(getter)</small></span><strong>{{ counter.doubled }}</strong></div>
					<div class="row"><span>label <small>(getter)</small></span><code>{{ counter.label }}</code></div>
				</div>
				<div class="actions">
					<button @click="counter.decrement()">− 감소</button>
					<button @click="counter.increment()">+ 증가</button>
				</div>
				<div class="actions">
					<input v-model.number="stepInput" type="number" min="1" style="width:60px" />
					<button @click="applyStep()">step 변경</button>
					<button class="warn" @click="resetCounter()">reset()</button>
				</div>
			</section>

			<!-- ── 2. getter + setter 쌍 ── -->
			<section>
				<h2>2. AuthStore</h2>
				<p class="desc">getter + setter 쌍 (token), getter only (isLoggedIn, maskedToken)</p>
				<div class="state-box">
					<div class="row"><span>username</span><strong>{{ auth.username || '(없음)' }}</strong></div>
					<div class="row"><span>token <small>(getter)</small></span><code>{{ auth.maskedToken }}</code></div>
					<div class="row">
						<span>isLoggedIn <small>(getter)</small></span>
						<strong :class="auth.isLoggedIn ? 'ok' : 'ng'">{{ auth.isLoggedIn }}</strong>
					</div>
					<div class="row"><span>loginCount</span><strong>{{ auth.loginCount }}</strong></div>
				</div>
				<div class="actions">
					<input v-model="loginUser" placeholder="username" style="width:100px" />
					<input v-model="loginToken" placeholder="token" style="width:110px" />
					<button class="ok" @click="doLogin()">login()</button>
				</div>
				<div class="actions">
					<button class="warn" @click="doLogout()">logout()</button>
					<button @click="setTokenDirectly()">token = 'manual_xyz' <small>(setter 직접)</small></button>
				</div>
			</section>

			<!-- ── 3. getter + setter (DOM side effect) ── -->
			<section>
				<h2>3. ThemeStore</h2>
				<p class="desc">setter에서 DOM side effect (data-theme 속성 변경)</p>
				<div class="state-box">
					<div class="row"><span>theme <small>(getter)</small></span><strong>{{ theme.theme }}</strong></div>
					<div class="row"><span>isDarkMode <small>(getter)</small></span><strong>{{ theme.isDarkMode }}</strong></div>
					<div class="row"><span>language</span><strong>{{ theme.language }}</strong></div>
					<div class="row"><span>fontSize</span><strong>{{ theme.fontSize }}px</strong></div>
				</div>
				<div class="actions">
					<button @click="theme.toggleTheme()">toggleTheme()</button>
					<button @click="setTheme('light')">theme = 'light' <small>(setter)</small></button>
					<button @click="setTheme('dark')">theme = 'dark' <small>(setter)</small></button>
				</div>
				<div class="actions">
					<button @click="theme.setFontSize(12)">fontSize=12</button>
					<button @click="theme.setFontSize(14)">fontSize=14</button>
					<button @click="theme.setFontSize(18)">fontSize=18</button>
				</div>
			</section>

			<!-- ── 4. setter only ── -->
			<section>
				<h2>4. WriteOnlyStore</h2>
				<p class="desc">setter only 엣지케이스 (getter 없는 setter)</p>
				<div class="state-box">
					<div class="row"><span>history.length <small>(getter)</small></span><strong>{{ writeOnly.history.length }}</strong></div>
					<div class="log-list">
						<div v-for="(entry, i) in writeOnly.history" :key="i" class="log-entry">{{ entry }}</div>
						<div v-if="writeOnly.history.length === 0" class="empty">메시지 없음</div>
					</div>
				</div>
				<div class="actions">
					<input v-model="writeMsg" placeholder="메시지 입력" style="width:160px" />
					<button @click="sendMessage()">lastMessage = … <small>(setter only)</small></button>
					<button class="warn" @click="writeOnly.clear()">clear()</button>
				</div>
			</section>

			<!-- ── 6. 메서드 간 this 호출 (버그 수정 검증) ── -->
			<section class="full-width">
				<h2>6. 메서드 간 this 호출</h2>
				<p class="desc">action 메서드 내부에서 <code>this.mutation()</code> 호출 — 수정 전 <code>TypeError: this.mutationTabShow is not a function</code> 발생</p>
				<div class="api-grid" style="grid-template-columns: repeat(2, 1fr)">
					<div>
						<h3>상태</h3>
						<div class="state-box">
							<div class="row"><span>tabShow</span><strong>{{ tabMenu.tabShow }}</strong></div>
							<div class="row"><span>tabValue</span><strong>{{ tabMenu.tabValue || '(없음)' }}</strong></div>
							<div class="row"><span>oldTabValue</span><strong>{{ tabMenu.oldTabValue || '(없음)' }}</strong></div>
						</div>
						<div v-if="tabCallError" class="error-box">{{ tabCallError }}</div>
					</div>
					<div>
						<h3>actionTabShow → mutationTabShow</h3>
						<p class="small">action이 내부적으로 mutation을 this로 호출</p>
						<div class="actions">
							<input v-model="tabShowInput" placeholder="Y / N" style="width:60px" />
							<button class="ok" @click="callActionTabShow()">actionTabShow()</button>
						</div>
						<h3 style="margin-top:12px">actionTabValue → mutationTabValue</h3>
						<p class="small">mutation 내에서 this.tabValue, this.oldTabValue 동시 변경</p>
						<div class="actions">
							<input v-model="tabValueInput" placeholder="탭 이름" style="width:100px" />
							<button class="ok" @click="callActionTabValue()">actionTabValue()</button>
						</div>
					</div>
				</div>
			</section>

			<!-- ── 5. McStore API ── -->
			<section class="full-width">
				<h2>5. McStore API</h2>
				<p class="desc">has() / define() / undefine() / setup() 밖 호출</p>
				<div class="api-grid">
					<div>
						<h3>McStore.has(key)</h3>
						<button @click="checkHas()">has() 결과 확인</button>
						<div class="state-box" style="margin-top:8px">
							<div v-for="(val, key) in hasResults" :key="key" class="row">
								<span>{{ key }}</span>
								<strong :class="val ? 'ok' : 'ng'">{{ val }}</strong>
							</div>
							<div v-if="!Object.keys(hasResults).length" class="empty">버튼을 눌러 확인</div>
						</div>
					</div>
					<div>
						<h3>McStore.define()</h3>
						<p class="small">앱 초기화 시점에 사전 등록</p>
						<button @click="preDefine()">define('notif', NotifState)</button>
					</div>
					<div>
						<h3>undefine() / 재생성</h3>
						<p class="small">counter store를 제거 후 재생성</p>
						<div class="actions">
							<button class="danger" @click="undefineCounter()">counter.undefine()</button>
							<button class="ok" @click="redefineCounter()">재접근 (자동 재등록)</button>
						</div>
					</div>
					<div>
						<h3>setup() 밖 호출</h3>
						<p class="small">router guard · interceptor 등에서도 동일 API 사용 가능</p>
						<button @click="callOutsideSetup()">McStore('counter', CounterState)</button>
					</div>
				</div>
			</section>

		</div>

		<!-- ── 콘솔 로그 패널 ── -->
		<section class="console-panel">
			<div class="console-header">
				<h2>Console</h2>
				<button class="small" @click="consoleLogs = []">지우기</button>
			</div>
			<div class="console-body">
				<div v-for="(line, i) in consoleLogs" :key="i" class="console-line">{{ line }}</div>
				<div v-if="!consoleLogs.length" class="empty">버튼을 누르면 콘솔 출력이 여기 표시됩니다.</div>
			</div>
		</section>
	</div>
</template>

<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body { font-family: 'Segoe UI', system-ui, sans-serif; background: #f5f5f5; }

.app { max-width: 1100px; margin: 0 auto; padding: 24px 16px; }
.app.dark { filter: invert(1) hue-rotate(180deg); }
.app.dark img { filter: invert(1) hue-rotate(180deg); }

header { display: flex; align-items: baseline; gap: 12px; margin-bottom: 24px; }
header h1 { font-size: 1.6rem; font-weight: 700; }
.version { font-size: 0.8rem; color: #888; background: #e8e8e8; padding: 2px 8px; border-radius: 99px; }

.grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.full-width { grid-column: 1 / -1; }

section { background: #fff; border: 1px solid #e0e0e0; border-radius: 10px; padding: 20px; }
section h2 { font-size: 1rem; font-weight: 700; margin-bottom: 4px; }
.desc { font-size: 0.78rem; color: #888; margin-bottom: 12px; }

.state-box { background: #f9f9f9; border: 1px solid #eee; border-radius: 6px; padding: 10px 12px; margin-bottom: 12px; }
.row { display: flex; justify-content: space-between; align-items: center; padding: 3px 0; font-size: 0.85rem; border-bottom: 1px solid #f0f0f0; }
.row:last-child { border-bottom: none; }
.row span { color: #555; }
.row strong { font-weight: 600; }
.row code { font-family: monospace; font-size: 0.8rem; background: #eee; padding: 1px 5px; border-radius: 3px; }
small { font-size: 0.72rem; color: #aaa; margin-left: 4px; }

.ok { color: #16a34a; }
.ng { color: #dc2626; }

.actions { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; align-items: center; }

button {
	padding: 5px 12px; font-size: 0.8rem; border: 1px solid #ccc;
	border-radius: 6px; background: #fff; cursor: pointer; white-space: nowrap;
}
button:hover { background: #f0f0f0; }
button.ok { background: #dcfce7; border-color: #86efac; color: #15803d; }
button.ok:hover { background: #bbf7d0; }
button.warn { background: #fef9c3; border-color: #fde047; color: #854d0e; }
button.warn:hover { background: #fef08a; }
button.danger { background: #fee2e2; border-color: #fca5a5; color: #b91c1c; }
button.danger:hover { background: #fecaca; }
button.small { padding: 2px 8px; font-size: 0.75rem; }

input { padding: 4px 8px; font-size: 0.85rem; border: 1px solid #ccc; border-radius: 6px; }

.api-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.api-grid h3 { font-size: 0.85rem; font-weight: 600; margin-bottom: 6px; }
.api-grid .small { font-size: 0.75rem; color: #888; margin-bottom: 8px; }

.log-list { max-height: 100px; overflow-y: auto; font-size: 0.78rem; color: #444; }
.log-entry { padding: 1px 0; border-bottom: 1px solid #f0f0f0; }
.empty { color: #bbb; font-size: 0.8rem; padding: 4px 0; }

.console-panel { margin-top: 20px; background: #1e1e1e; border-radius: 10px; overflow: hidden; }
.console-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; background: #2d2d2d; }
.console-header h2 { color: #ccc; font-size: 0.9rem; }
.console-header button { background: #444; border-color: #555; color: #ccc; }
.console-header button:hover { background: #555; }
.console-body { padding: 12px 16px; min-height: 120px; max-height: 240px; overflow-y: auto; }
.console-line { font-family: 'Consolas', monospace; font-size: 0.8rem; color: #a8d8a8; padding: 2px 0; border-bottom: 1px solid #2d2d2d; }
.console-body .empty { color: #555; font-size: 0.8rem; font-family: monospace; }

.error-box { background: #fee2e2; border: 1px solid #fca5a5; border-radius: 6px; padding: 8px 12px; font-size: 0.8rem; color: #b91c1c; font-family: monospace; margin-top: 8px; }
</style>
