#!/usr/bin/env node

/**
 * Build script that bundles the SvelteKit-generated worker with a custom
 * entry point that adds scheduled handler support for Cloudflare Workers.
 *
 * This enables:
 * - Cloudflare Deploy Button support (Workers only, not Pages)
 * - Merged scheduler functionality (cron triggers in main worker)
 * - Workers Static Assets for serving the frontend
 */

import { build } from 'esbuild';
import { cpSync, mkdirSync, rmSync, existsSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

const SVELTEKIT_OUTPUT = join(projectRoot, '.svelte-kit', 'cloudflare');
const DIST_DIR = join(projectRoot, 'dist');
const WRAPPER_FILE = join(projectRoot, '.svelte-kit', '_worker-wrapper.js');

async function main() {
	console.log('[build-worker] Starting worker build...');

	// Check that SvelteKit has been built
	if (!existsSync(SVELTEKIT_OUTPUT)) {
		console.error('[build-worker] Error: SvelteKit output not found.');
		console.error('[build-worker] Run "vite build" first to generate .svelte-kit/cloudflare/');
		process.exit(1);
	}

	// Clean and create dist directory
	if (existsSync(DIST_DIR)) {
		rmSync(DIST_DIR, { recursive: true });
	}
	mkdirSync(DIST_DIR, { recursive: true });

	// Copy static assets (everything except _worker.js and _routes.json)
	console.log('[build-worker] Copying static assets to dist/...');
	const files = readdirSync(SVELTEKIT_OUTPUT);
	for (const file of files) {
		if (file === '_worker.js' || file === '_routes.json') {
			continue;
		}
		const src = join(SVELTEKIT_OUTPUT, file);
		const dest = join(DIST_DIR, file);
		cpSync(src, dest, { recursive: true });
	}

	// Create a wrapper that imports the SvelteKit handler and adds scheduled support
	console.log('[build-worker] Creating worker wrapper...');
	const wrapperCode = `
// Auto-generated wrapper - adds scheduled handler to SvelteKit's fetch handler
import svelteKitHandler from './cloudflare/_worker.js';

export default {
	async fetch(request, env, ctx) {
		return svelteKitHandler.fetch(request, env, ctx);
	},

	async scheduled(controller, env, ctx) {
		console.log('[Scheduler] Triggering health checks at ' + new Date().toISOString());

		if (!env.CRON_SECRET) {
			console.error('[Scheduler] CRON_SECRET not configured');
			return;
		}

		const request = new Request('https://pingflare.internal/api/cron', {
			method: 'GET',
			headers: {
				'User-Agent': 'Pingflare-Scheduler/1.0',
				'X-Cron-Secret': env.CRON_SECRET
			}
		});

		try {
			const response = await svelteKitHandler.fetch(request, env, ctx);
			if (!response.ok) {
				console.error('[Scheduler] Cron endpoint returned ' + response.status);
				return;
			}
			const result = await response.json();
			console.log('[Scheduler] Health checks completed:', JSON.stringify(result));
		} catch (error) {
			console.error('[Scheduler] Failed to trigger health checks:', error);
		}
	}
};
`;
	writeFileSync(WRAPPER_FILE, wrapperCode);

	// Bundle with esbuild
	console.log('[build-worker] Bundling worker with esbuild...');
	try {
		await build({
			entryPoints: [WRAPPER_FILE],
			bundle: true,
			outfile: join(DIST_DIR, '_worker.js'),
			format: 'esm',
			platform: 'browser',
			target: 'es2022',
			minify: true,
			sourcemap: false,
			// External modules provided by Cloudflare runtime
			external: ['cloudflare:*', '__STATIC_CONTENT_MANIFEST'],
			// Resolve from .svelte-kit directory
			absWorkingDir: join(projectRoot, '.svelte-kit'),
			// Handle node built-ins
			define: {
				'process.env.NODE_ENV': '"production"'
			},
			// Log level
			logLevel: 'info'
		});
	} catch (error) {
		console.error('[build-worker] Bundle failed:', error);
		process.exit(1);
	}

	// Cleanup wrapper file
	rmSync(WRAPPER_FILE, { force: true });

	console.log('[build-worker] Build complete!');
	console.log('[build-worker] Output: dist/_worker.js + static assets');
}

main().catch((error) => {
	console.error('[build-worker] Unexpected error:', error);
	process.exit(1);
});
