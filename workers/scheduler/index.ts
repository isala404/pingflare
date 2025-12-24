interface Env {
	PINGFLARE_URL: string;
}

export default {
	async scheduled(
		controller: ScheduledController,
		env: Env,
		ctx: ExecutionContext
	): Promise<void> {
		const url = env.PINGFLARE_URL || 'https://pingflare.pages.dev';
		const cronEndpoint = `${url}/api/cron`;

		console.log(`[Scheduler] Triggering health checks at ${new Date().toISOString()}`);

		try {
			const response = await fetch(cronEndpoint, {
				method: 'GET',
				headers: {
					'User-Agent': 'Pingflare-Scheduler/1.0'
				}
			});

			if (!response.ok) {
				console.error(`[Scheduler] Cron endpoint returned ${response.status}`);
				return;
			}

			const result = await response.json();
			console.log(`[Scheduler] Health checks completed:`, result);
		} catch (error) {
			console.error(`[Scheduler] Failed to trigger health checks:`, error);
		}
	},

	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === '/trigger') {
			await this.scheduled({} as ScheduledController, env, ctx);
			return new Response(JSON.stringify({ message: 'Health checks triggered' }), {
				headers: { 'Content-Type': 'application/json' }
			});
		}

		return new Response(JSON.stringify({
			name: 'pingflare-scheduler',
			status: 'running',
			endpoints: {
				'/trigger': 'Manually trigger health checks'
			}
		}), {
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
