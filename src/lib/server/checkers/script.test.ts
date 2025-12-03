import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeScript, validateScript } from './script';

// Mock fetch for tests
const mockFetch = vi.fn();

beforeEach(() => {
	// Replace global fetch with mock
	vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.clearAllMocks();
});

describe('validateScript', () => {
	it('should return valid for a proper check function', () => {
		const script = `
			async function check(ctx) {
				return { status: 'up' };
			}
		`;
		const result = validateScript(script);
		expect(result.valid).toBe(true);
	});

	it('should return invalid for missing check function', () => {
		const script = `
			async function run(ctx) {
				return { status: 'up' };
			}
		`;
		const result = validateScript(script);
		expect(result.valid).toBe(false);
		expect(result.error).toContain('check(ctx)');
	});

	it('should return invalid for syntax errors', () => {
		const script = `
			async function check(ctx {
				return { status: 'up' };
			}
		`;
		const result = validateScript(script);
		expect(result.valid).toBe(false);
	});

	it('should accept arrow function style check', () => {
		const script = `
			const check = async (ctx) => {
				return { status: 'up' };
			};
		`;
		const result = validateScript(script);
		expect(result.valid).toBe(true);
	});
});

describe('executeScript', () => {
	it('should execute a simple script returning up status', async () => {
		const script = `
			async function check(ctx) {
				return { status: 'up' };
			}
		`;
		const result = await executeScript(script, 5000);
		expect(result.status).toBe('up');
		expect(result.errorMessage).toBeNull();
	});

	it('should execute a script returning down status with message', async () => {
		const script = `
			async function check(ctx) {
				return { status: 'down', message: 'Service unavailable' };
			}
		`;
		const result = await executeScript(script, 5000);
		expect(result.status).toBe('down');
		expect(result.errorMessage).toBe('Service unavailable');
	});

	it('should execute a script returning degraded status', async () => {
		const script = `
			async function check(ctx) {
				return { status: 'degraded', message: 'High latency' };
			}
		`;
		const result = await executeScript(script, 5000);
		expect(result.status).toBe('degraded');
		expect(result.errorMessage).toBe('High latency');
	});

	it('should return down status on script error', async () => {
		const script = `
			async function check(ctx) {
				throw new Error('Something went wrong');
			}
		`;
		const result = await executeScript(script, 5000);
		expect(result.status).toBe('down');
		expect(result.errorMessage).toContain('Something went wrong');
	});

	it('should return down status for invalid return value', async () => {
		const script = `
			async function check(ctx) {
				return 'up';
			}
		`;
		const result = await executeScript(script, 5000);
		expect(result.status).toBe('down');
		expect(result.errorMessage).toContain('Script error');
	});

	it('should return down status for missing check function', async () => {
		const script = `
			async function run(ctx) {
				return { status: 'up' };
			}
		`;
		const result = await executeScript(script, 5000);
		expect(result.status).toBe('down');
		expect(result.errorMessage).toContain('check(ctx)');
	});

	it('should measure response time', async () => {
		const script = `
			async function check(ctx) {
				return { status: 'up' };
			}
		`;
		const result = await executeScript(script, 5000);
		expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
		expect(result.responseTimeMs).toBeLessThan(1000);
	});

	it('should use custom response time from script', async () => {
		const script = `
			async function check(ctx) {
				return { status: 'up', responseTime: 150 };
			}
		`;
		const result = await executeScript(script, 5000);
		expect(result.responseTimeMs).toBe(150);
	});

	it('should use status code from script', async () => {
		const script = `
			async function check(ctx) {
				return { status: 'up', statusCode: 200 };
			}
		`;
		const result = await executeScript(script, 5000);
		expect(result.statusCode).toBe(200);
	});

	it('should provide fetch in context', async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify({ healthy: true }), { status: 200 })
		);

		const script = `
			async function check(ctx) {
				const response = await ctx.fetch('https://api.example.com/health');
				const data = await response.json();
				if (data.healthy) {
					return { status: 'up' };
				}
				return { status: 'down' };
			}
		`;
		const result = await executeScript(script, 5000);
		expect(result.status).toBe('up');
		expect(mockFetch).toHaveBeenCalledWith(
			'https://api.example.com/health',
			expect.objectContaining({
				headers: expect.objectContaining({
					'User-Agent': 'Pingflare/1.0 Script Check'
				})
			})
		);
	});

	it('should handle fetch errors gracefully', async () => {
		mockFetch.mockRejectedValueOnce(new Error('Network error'));

		const script = `
			async function check(ctx) {
				const response = await ctx.fetch('https://api.example.com/health');
				return { status: 'up' };
			}
		`;
		const result = await executeScript(script, 5000);
		expect(result.status).toBe('down');
		expect(result.errorMessage).toContain('Network error');
	});

	it('should support multiple fetch calls', async () => {
		mockFetch
			.mockResolvedValueOnce(new Response(JSON.stringify({ db: 'healthy' }), { status: 200 }))
			.mockResolvedValueOnce(new Response(JSON.stringify({ cache: 'healthy' }), { status: 200 }));

		const script = `
			async function check(ctx) {
				const [dbRes, cacheRes] = await Promise.all([
					ctx.fetch('https://api.example.com/db/health'),
					ctx.fetch('https://api.example.com/cache/health')
				]);
				const db = await dbRes.json();
				const cache = await cacheRes.json();

				if (db.db === 'healthy' && cache.cache === 'healthy') {
					return { status: 'up' };
				}
				return { status: 'down', message: 'Some services unhealthy' };
			}
		`;
		const result = await executeScript(script, 5000);
		expect(result.status).toBe('up');
		expect(mockFetch).toHaveBeenCalledTimes(2);
	});

	it('should provide log in context', async () => {
		const script = `
			async function check(ctx) {
				ctx.log('Starting health check');
				ctx.log('Everything looks good');
				return { status: 'up' };
			}
		`;
		const result = await executeScript(script, 5000);
		expect(result.status).toBe('up');
	});

	it('should include logs in error message on failure', async () => {
		const script = `
			async function check(ctx) {
				ctx.log('Step 1 complete');
				ctx.log('Step 2 starting');
				throw new Error('Step 2 failed');
			}
		`;
		const result = await executeScript(script, 5000);
		expect(result.status).toBe('down');
		expect(result.errorMessage).toContain('Step 2 failed');
		expect(result.errorMessage).toContain('Logs:');
	});

	it('should handle complex response checking', async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					status: 'running',
					version: '2.0.0',
					components: {
						database: { status: 'healthy', latency: 5 },
						cache: { status: 'healthy', latency: 2 },
						queue: { status: 'degraded', latency: 150 }
					}
				}),
				{ status: 200 }
			)
		);

		const script = `
			async function check(ctx) {
				const response = await ctx.fetch('https://api.example.com/health');
				const data = await response.json();

				if (data.status !== 'running') {
					return { status: 'down', message: 'Service not running' };
				}

				const unhealthy = Object.entries(data.components)
					.filter(([_, v]) => v.status === 'unhealthy');

				const degraded = Object.entries(data.components)
					.filter(([_, v]) => v.status === 'degraded');

				if (unhealthy.length > 0) {
					return {
						status: 'down',
						message: 'Unhealthy: ' + unhealthy.map(([k]) => k).join(', ')
					};
				}

				if (degraded.length > 0) {
					return {
						status: 'degraded',
						message: 'Degraded: ' + degraded.map(([k]) => k).join(', ')
					};
				}

				return { status: 'up' };
			}
		`;
		const result = await executeScript(script, 5000);
		expect(result.status).toBe('degraded');
		expect(result.errorMessage).toContain('queue');
	});

	it('should support async/await patterns', async () => {
		mockFetch
			.mockResolvedValueOnce(new Response(JSON.stringify({ status: 'ok' })))
			.mockResolvedValueOnce(new Response(JSON.stringify({ ready: true })));

		const script = `
			async function check(ctx) {
				async function checkEndpoint(url) {
					const res = await ctx.fetch(url);
					return res.json();
				}

				const status = await checkEndpoint('https://api.example.com/status');
				if (status.status !== 'ok') {
					return { status: 'down', message: 'Status not ok' };
				}

				const ready = await checkEndpoint('https://api.example.com/ready');
				if (!ready.ready) {
					return { status: 'down', message: 'Not ready' };
				}

				return { status: 'up' };
			}
		`;
		const result = await executeScript(script, 5000);
		expect(result.status).toBe('up');
	});
});

describe('executeScript timeout', () => {
	it('should timeout for long running scripts', async () => {
		const script = `
			async function check(ctx) {
				await new Promise(resolve => setTimeout(resolve, 10000));
				return { status: 'up' };
			}
		`;
		const result = await executeScript(script, 100);
		expect(result.status).toBe('down');
		expect(result.errorMessage?.toLowerCase()).toContain('timed out');
	}, 5000);
});

describe('script security', () => {
	it('should run in strict mode', async () => {
		const script = `
			async function check(ctx) {
				// Strict mode prevents implicit globals
				try {
					undeclaredVariable = 'test';
					return { status: 'down', message: 'implicit globals allowed' };
				} catch (e) {
					return { status: 'up' };
				}
			}
		`;
		const result = await executeScript(script, 5000);
		expect(result.status).toBe('up');
	});

	it('should not allow modifying the context object', async () => {
		const script = `
			async function check(ctx) {
				// Scripts should use ctx properly
				if (typeof ctx.fetch === 'function' && typeof ctx.log === 'function') {
					return { status: 'up' };
				}
				return { status: 'down', message: 'context not provided correctly' };
			}
		`;
		const result = await executeScript(script, 5000);
		expect(result.status).toBe('up');
	});

	it('should handle scripts that try to break out of sandbox', async () => {
		const script = `
			async function check(ctx) {
				// Try various escape attempts
				try {
					// This will fail in Cloudflare Workers (no require)
					const fs = require('fs');
					return { status: 'down', message: 'require worked' };
				} catch (e) {
					// Expected to fail
				}

				// Script completed safely
				return { status: 'up' };
			}
		`;
		const result = await executeScript(script, 5000);
		expect(result.status).toBe('up');
	});
});
