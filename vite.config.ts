import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	base: process.env.GITHUB_ACTIONS === 'true' ? '/chesstrain/' : '/',
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		exclude: ['e2e/**', 'node_modules/**', '.svelte-kit/**'],
		testTimeout: 15000
	},
	plugins: [
		sveltekit()
	],

	// Allow @xenova/transformers to run in Web Workers
	optimizeDeps: {
		exclude: ['@xenova/transformers'],
	},

	worker: {
		format: 'es',
	},

	// Required for transformers.js WASM/ONNX files
	server: {
		headers: {
			'Cross-Origin-Opener-Policy': 'same-origin',
			'Cross-Origin-Embedder-Policy': 'require-corp',
		}
	}
});
