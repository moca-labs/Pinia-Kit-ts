# @moca-labs/pinia-kit-ts

Pinia를 더 효과적으로 사용하기 위한 TypeScript 유틸리티 라이브러리입니다.  
클래스 기반으로 store를 정의하고, `setup()` 안팎 어디서든 동일한 API로 접근할 수 있습니다.

## 설치

```bash
npm install @moca-labs/pinia-kit-ts
```

peerDependencies로 `pinia`와 `vue`가 필요합니다.

```bash
npm install pinia vue
```

---

## Import

```ts
import { McStore, McStoreManager } from "@moca-labs/pinia-kit-ts"
```

---

## 셋업

`main.ts`에서 `McStore.create()`로 Pinia를 등록합니다.

```ts
import { createApp } from "vue"
import { createPinia } from "pinia"
import { McStore } from "@moca-labs/pinia-kit-ts"
import App from "./App.vue"

const app = createApp(App)
app.use(McStore.create(createPinia()))
app.mount("#app")
```

Pinia 플러그인이 필요한 경우:

```ts
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
app.use(McStore.create(pinia))
```

---

## Store 정의

클래스로 store를 정의합니다.

- **인스턴스 프로퍼티** → Pinia state
- **getter** → Pinia getters
- **메서드** → Pinia actions

```ts
// stores/user.ts
class UserStore {
  name = ""
  token = ""

  get isLoggedIn() {
    return !!this.token
  }

  login(name: string, token: string) {
    this.name = name
    this.token = token
  }

  logout() {
    this.name = ""
    this.token = ""
  }
}
```

---

## 사용법

### `McStore(key, Class)` — store 접근

등록되어 있지 않으면 자동으로 등록 후 반환합니다.  
`setup()` 안팎 어디서든 동일하게 사용할 수 있습니다.

```ts
// <script setup>
const user = McStore("user", UserStore)

user.login("darkangel", "token123")
console.log(user.isLoggedIn) // true
```

같은 key로 접근하면 항상 동일한 reactive 상태를 공유합니다.

```ts
// ComponentA
const user = McStore("user", UserStore)
user.name = "dark"

// ComponentB
const user = McStore("user", UserStore)
console.log(user.name) // "dark" ← 동일한 상태
```

### `user.reset()` — 초기값 복원

store 상태를 등록 시점의 초기값으로 복원합니다.

```ts
user.reset()

// 컴포넌트 unmount 시 자동 복원
onUnmounted(() => user.reset())
```

### `user.undefine()` — 완전 제거

Pinia와 registry에서 store를 완전히 제거합니다.  
이후 `McStore(key, Class)` 호출 시 초기값으로 새로 생성됩니다.

```ts
user.undefine()

// 컴포넌트 unmount 시 자동 제거
onUnmounted(() => user.undefine())
```

### `McStore.define(key, Class)` — 명시적 사전 등록

앱 초기화 시점에 미리 store를 등록해둘 때 사용합니다.

```ts
// stores/index.ts
McStore.define("user", UserStore)
McStore.define("cart", CartStore)
```

### `McStore.has(key)` — 등록 여부 확인

```ts
McStore.has("user") // true or false
```

---

## setup() 밖에서 사용

axios interceptor, router guard 등 Vue `setup()` 컨텍스트 밖에서도 동일하게 사용할 수 있습니다.

```ts
// axios interceptor
axios.interceptors.request.use((config) => {
  const token = McStore("user", UserStore).token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// router guard
router.beforeEach(() => {
  if (!McStore("user", UserStore).isLoggedIn) {
    return "/login"
  }
})
```

### `McStoreManager.use()` — 기존 Pinia store 외부 접근

`McStore.define()`으로 등록되지 않은 기존 Pinia store를 `setup()` 밖에서 사용할 때 씁니다.

```ts
McStoreManager.use(useAppStore).setLoading(true)
```

---

## 전체 예제

```ts
// stores/user.ts
import { McStore } from "@moca-labs/pinia-kit-ts"

class UserStore {
  name = ""
  token = ""
  age = 0

  get isLoggedIn() { return !!this.token }
  get displayName() { return this.name || "게스트" }

  login(name: string, token: string) {
    this.name = name
    this.token = token
  }

  logout() {
    this.name = ""
    this.token = ""
  }
}

// 명시적 사전 등록 (선택)
McStore.define("user", UserStore)
```

```vue
<!-- UserProfile.vue -->
<script setup lang="ts">
import { onUnmounted } from "vue"
import { McStore } from "@moca-labs/pinia-kit-ts"

const user = McStore("user", UserStore)

onUnmounted(() => user.reset())
</script>

<template>
  <div>
    <p>{{ user.displayName }}</p>
    <button @click="user.login('dark', 'abc123')">로그인</button>
    <button @click="user.logout()">로그아웃</button>
  </div>
</template>
```

---

## API 요약

| API | 설명 |
|-----|------|
| `McStore.create(pinia)` | Vue 플러그인 생성 (`app.use`에 전달) |
| `McStore(key, Class)` | store 접근 (미등록 시 자동 등록) |
| `McStore.define(key, Class)` | 명시적 사전 등록 |
| `McStore.has(key)` | 등록 여부 확인 |
| `store.reset()` | 초기값으로 상태 복원 |
| `store.undefine()` | Pinia + registry에서 완전 제거 |
| `McStoreManager.use(hook)` | 기존 Pinia store 외부 접근 |

---

## License

Apache-2.0
