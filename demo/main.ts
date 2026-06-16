import { createApp } from 'vue'
import { McStore } from '@moca-labs/pinia-kit-ts'
import { createPinia } from 'pinia'
import App from './App.vue'

const app = createApp(App)
app.use(McStore.create(createPinia()))
app.mount('#app')
