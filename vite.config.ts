import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
	plugins: [vue()],
	root: resolve(__dirname, 'demo'),
	resolve: {
		alias: {
			'@moca-labs/pinia-kit-ts': resolve(__dirname, 'src/index.ts'),
		},
	},
})
