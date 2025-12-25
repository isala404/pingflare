import { describe, it, expect, mock } from 'bun:test';
import { validateScript, executeScript } from './script';

describe('validateScript', () => {
	it('should return valid for a proper JSON DSL script', () => {
		const script = JSON.stringify({
			steps: [
				{
					name: 'check_health',
					request: {
						method: 'GET',
						url: 'https://api.example.com/health'
					}
				}
			]
		});
		const result = validateScript(script);
		expect(result.valid).toBe(true);
	});

	it('should return valid for script with assertions', () => {
		const script = JSON.stringify({
			steps: [
				{
					name: 'check_api',
					request: {
						method: 'GET',
						url: 'https://api.example.com/status'
					},
					assert: [
						{ check: 'status', equals: 200 },
						{ check: 'json.healthy', equals: true }
					]
				}
			]
		});
		const result = validateScript(script);
		expect(result.valid).toBe(true);
	});

	it('should return valid for multi-step script with variable extraction', () => {
		const script = JSON.stringify({
			steps: [
				{
					name: 'login',
					request: {
						method: 'POST',
						url: 'https://api.example.com/login',
						headers: { 'Content-Type': 'application/json' },
						body: { user: 'test', pass: 'secret' }
					},
					extract: {
						token: 'json.token'
					}
				},
				{
					name: 'get_data',
					request: {
						method: 'GET',
						url: 'https://api.example.com/data',
						headers: { Authorization: 'Bearer ${token}' }
					},
					assert: [{ check: 'status', equals: 200 }]
				}
			]
		});
		const result = validateScript(script);
		expect(result.valid).toBe(true);
	});

	it('should return invalid for empty script', () => {
		const result = validateScript('');
		expect(result.valid).toBe(false);
	});

	it('should return invalid for invalid JSON', () => {
		const script = '{ invalid json }';
		const result = validateScript(script);
		expect(result.valid).toBe(false);
	});

	it('should return invalid for missing steps array', () => {
		const script = JSON.stringify({ name: 'test' });
		const result = validateScript(script);
		expect(result.valid).toBe(false);
		expect(result.error).toContain('steps');
	});

	it('should return invalid for empty steps array', () => {
		const script = JSON.stringify({ steps: [] });
		const result = validateScript(script);
		expect(result.valid).toBe(false);
		expect(result.error).toContain('at least one step');
	});

	it('should return invalid for step without name', () => {
		const script = JSON.stringify({
			steps: [
				{
					request: {
						method: 'GET',
						url: 'https://api.example.com/health'
					}
				}
			]
		});
		const result = validateScript(script);
		expect(result.valid).toBe(false);
		expect(result.error).toContain('name');
	});

	it('should return invalid for step without URL', () => {
		const script = JSON.stringify({
			steps: [
				{
					name: 'check',
					request: {
						method: 'GET'
					}
				}
			]
		});
		const result = validateScript(script);
		expect(result.valid).toBe(false);
		expect(result.error).toContain('URL');
	});

	it('should return invalid for step without method', () => {
		const script = JSON.stringify({
			steps: [
				{
					name: 'check',
					request: {
						url: 'https://api.example.com/health'
					}
				}
			]
		});
		const result = validateScript(script);
		expect(result.valid).toBe(false);
		expect(result.error).toContain('method');
	});

	it('should accept all HTTP methods', () => {
		const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'];
		for (const method of methods) {
			const script = JSON.stringify({
				steps: [
					{
						name: 'test',
						request: { method, url: 'https://example.com' }
					}
				]
			});
			const result = validateScript(script);
			expect(result.valid).toBe(true);
		}
	});

	it('should return valid for script with assertion severity', () => {
		const script = JSON.stringify({
			steps: [
				{
					name: 'check_api',
					request: {
						method: 'GET',
						url: 'https://api.example.com/status'
					},
					assert: [
						{ check: 'status', equals: 200, severity: 'down' },
						{ check: 'responseTime', lessThan: 500, severity: 'degraded' }
					]
				}
			]
		});
		const result = validateScript(script);
		expect(result.valid).toBe(true);
	});

	it('should return valid for script with responseTime assertion', () => {
		const script = JSON.stringify({
			steps: [
				{
					name: 'performance_check',
					request: {
						method: 'GET',
						url: 'https://api.example.com/health'
					},
					assert: [{ check: 'responseTime', lessThan: 1000 }]
				}
			]
		});
		const result = validateScript(script);
		expect(result.valid).toBe(true);
	});
});

describe('executeScript', () => {
	it('should return down status when assertion with severity=down fails', async () => {
		const originalFetch = globalThis.fetch;
		globalThis.fetch = mock(() =>
			Promise.resolve(
				new Response(JSON.stringify({ healthy: true }), {
					status: 500,
					headers: { 'Content-Type': 'application/json' }
				})
			)
		);

		try {
			const script = JSON.stringify({
				steps: [
					{
						name: 'check_status',
						request: {
							method: 'GET',
							url: 'https://api.example.com/health'
						},
						assert: [{ check: 'status', equals: 200, severity: 'down' }]
					}
				]
			});
			const result = await executeScript(script);
			expect(result.status).toBe('down');
			expect(result.errorMessage).toContain('assertion');
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	it('should return degraded status when assertion with default severity fails', async () => {
		const originalFetch = globalThis.fetch;
		globalThis.fetch = mock(() =>
			Promise.resolve(
				new Response(JSON.stringify({ healthy: false }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				})
			)
		);

		try {
			const script = JSON.stringify({
				steps: [
					{
						name: 'check_health',
						request: {
							method: 'GET',
							url: 'https://api.example.com/health'
						},
						assert: [{ check: 'json.healthy', equals: true }]
					}
				]
			});
			const result = await executeScript(script);
			expect(result.status).toBe('degraded');
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	it('should return degraded status when assertion with severity=degraded fails', async () => {
		const originalFetch = globalThis.fetch;
		globalThis.fetch = mock(() =>
			Promise.resolve(
				new Response(JSON.stringify({ count: 5 }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				})
			)
		);

		try {
			const script = JSON.stringify({
				steps: [
					{
						name: 'check_count',
						request: {
							method: 'GET',
							url: 'https://api.example.com/data'
						},
						assert: [{ check: 'json.count', greaterThan: 10, severity: 'degraded' }]
					}
				]
			});
			const result = await executeScript(script);
			expect(result.status).toBe('degraded');
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	it('should allow responseTime assertion', async () => {
		const originalFetch = globalThis.fetch;
		globalThis.fetch = mock(() =>
			Promise.resolve(
				new Response('OK', {
					status: 200
				})
			)
		);

		try {
			const script = JSON.stringify({
				steps: [
					{
						name: 'check_performance',
						request: {
							method: 'GET',
							url: 'https://api.example.com/health'
						},
						assert: [{ check: 'responseTime', lessThan: 10000 }]
					}
				]
			});
			const result = await executeScript(script);
			expect(result.status).toBe('up');
			expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	it('should return down when both down and degraded severity assertions fail', async () => {
		const originalFetch = globalThis.fetch;
		globalThis.fetch = mock(() =>
			Promise.resolve(
				new Response(JSON.stringify({ healthy: false }), {
					status: 500,
					headers: { 'Content-Type': 'application/json' }
				})
			)
		);

		try {
			const script = JSON.stringify({
				steps: [
					{
						name: 'multi_check',
						request: {
							method: 'GET',
							url: 'https://api.example.com/health'
						},
						assert: [
							{ check: 'status', equals: 200, severity: 'down' },
							{ check: 'json.healthy', equals: true, severity: 'degraded' }
						]
					}
				]
			});
			const result = await executeScript(script);
			expect(result.status).toBe('down');
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	it('should return up when all assertions pass', async () => {
		const originalFetch = globalThis.fetch;
		globalThis.fetch = mock(() =>
			Promise.resolve(
				new Response(JSON.stringify({ healthy: true }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				})
			)
		);

		try {
			const script = JSON.stringify({
				steps: [
					{
						name: 'full_check',
						request: {
							method: 'GET',
							url: 'https://api.example.com/health'
						},
						assert: [
							{ check: 'status', equals: 200, severity: 'down' },
							{ check: 'json.healthy', equals: true }
						]
					}
				]
			});
			const result = await executeScript(script);
			expect(result.status).toBe('up');
		} finally {
			globalThis.fetch = originalFetch;
		}
	});
});
