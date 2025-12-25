/**
 * Custom Cloudflare Worker entry point that wraps SvelteKit's generated handler
 * and adds a scheduled handler for cron-triggered health checks.
 *
 * This enables deployment via Cloudflare Workers (with Deploy Button support)
 * instead of Cloudflare Pages.
 */

// The SvelteKit handler is imported at build time from the generated output
// @ts-expect-error - This import is resolved during the build process
import svelteKitHandler from './__sveltekit/handler.js';

interface Env {
	DB: D1Database;
	ASSETS: Fetcher;
	ENVIRONMENT?: string;
	CRON_SECRET?: string;
}

export default {
	/**
	 * Handle incoming HTTP requests by delegating to SvelteKit's generated handler.
	 */
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		return svelteKitHandler.fetch(request, env, ctx);
	},

	/**
	 * Handle scheduled cron triggers by invoking the /api/cron endpoint.
	 * This replaces the separate scheduler worker.
	 */
	async scheduled(
		controller: ScheduledController,
		env: Env,
		ctx: ExecutionContext
	): Promise<void> {
		console.log(`[Scheduler] Triggering health checks at ${new Date().toISOString()}`);

		if (!env.CRON_SECRET) {
			console.error('[Scheduler] CRON_SECRET not configured');
			return;
		}

		// Create a synthetic request to the cron endpoint
		// The URL doesn't matter for internal routing - SvelteKit will match the path
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
				console.error(`[Scheduler] Cron endpoint returned ${response.status}`);
				return;
			}

			const result = await response.json();
			console.log('[Scheduler] Health checks completed:', JSON.stringify(result));
		} catch (error) {
			console.error('[Scheduler] Failed to trigger health checks:', error);
		}
	}
};
