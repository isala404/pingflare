import { describe, it, expect } from 'bun:test';
import { validateScript } from './script';

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
		expect(result.error).toContain('fetch()');
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

	it('should handle legacy fetch() style scripts', () => {
		const script = `
			async function check(ctx) {
				const response = await ctx.fetch('https://api.example.com/health');
				return { status: 'up' };
			}
		`;
		const result = validateScript(script);
		expect(result.valid).toBe(true);
	});

	it('should extract URLs from legacy scripts', () => {
		const script = `
			fetch('https://api.example.com/endpoint1');
			ctx.fetch('https://api.example.com/endpoint2');
		`;
		const result = validateScript(script);
		expect(result.valid).toBe(true);
	});
});
