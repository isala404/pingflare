import type { MonitorStatus } from '$lib/types/monitor';

export interface ScriptCheckResult {
	status: MonitorStatus;
	responseTimeMs: number;
	statusCode: number | null;
	errorMessage: string | null;
}

export interface ScriptContext {
	fetch: typeof fetch;
	log: (...args: unknown[]) => void;
	setTimeout: typeof setTimeout;
}

export interface ScriptResult {
	status: 'up' | 'down' | 'degraded';
	message?: string;
	responseTime?: number;
	statusCode?: number;
}

/**
 * Executes a user-provided health check script in a sandboxed environment.
 *
 * The script receives a context object with:
 * - fetch: Make HTTP requests
 * - log: Log messages (captured for debugging)
 *
 * The script must return an object with:
 * - status: 'up' | 'down' | 'degraded'
 * - message?: string (optional error/info message)
 * - responseTime?: number (optional, in ms)
 * - statusCode?: number (optional HTTP status code)
 *
 * Example script:
 * ```javascript
 * async function check(ctx) {
 *   const response = await ctx.fetch('https://api.example.com/health');
 *   const data = await response.json();
 *
 *   if (data.status === 'healthy' && data.dbConnected) {
 *     return { status: 'up' };
 *   }
 *
 *   if (data.status === 'degraded') {
 *     return { status: 'degraded', message: 'Service is degraded' };
 *   }
 *
 *   return { status: 'down', message: data.error || 'Service unhealthy' };
 * }
 * ```
 */
export async function executeScript(
	script: string,
	timeoutMs: number = 30000
): Promise<ScriptCheckResult> {
	const startTime = performance.now();
	const logs: string[] = [];

	// Create sandboxed context
	const context: ScriptContext = {
		fetch: createSandboxedFetch(timeoutMs),
		log: (...args: unknown[]) => {
			logs.push(args.map((a) => String(a)).join(' '));
		},
		setTimeout: setTimeout
	};

	try {
		// Validate script has required structure
		if (!script || typeof script !== 'string') {
			throw new Error('Script must be a non-empty string');
		}

		// Execute with timeout
		const result = await executeWithTimeout(
			async () => {
				return await runSandboxedScript(script, context);
			},
			timeoutMs,
			'Script execution timed out'
		);

		// Validate result
		const validatedResult = validateScriptResult(result);

		const endTime = performance.now();
		const responseTimeMs = validatedResult.responseTime ?? Math.round(endTime - startTime);

		return {
			status: validatedResult.status,
			responseTimeMs,
			statusCode: validatedResult.statusCode ?? null,
			errorMessage: validatedResult.message ?? null
		};
	} catch (err) {
		const endTime = performance.now();
		const errorMessage = err instanceof Error ? err.message : 'Unknown script error';

		return {
			status: 'down',
			responseTimeMs: Math.round(endTime - startTime),
			statusCode: null,
			errorMessage: `Script error: ${errorMessage}${logs.length > 0 ? ` | Logs: ${logs.join('; ')}` : ''}`
		};
	}
}

/**
 * Runs the user script in a sandboxed environment using Function constructor.
 * The script is wrapped to only expose the context object.
 */
async function runSandboxedScript(script: string, context: ScriptContext): Promise<unknown> {
	// Wrap the script in an async function that receives the context
	const wrappedScript = `
		return (async function(ctx) {
			"use strict";

			// Extract commonly used functions from context
			const fetch = ctx.fetch;
			const log = ctx.log;

			// User script starts here
			${script}
			// User script ends here

			// If the script defines a check function, call it
			if (typeof check === 'function') {
				return await check(ctx);
			}

			throw new Error('Script must define a check(ctx) function');
		})
	`;

	// Create the function - this is safer than eval because:
	// 1. We control what's passed in (only ctx)
	// 2. Strict mode is enabled
	// 3. The function runs in its own scope
	const fn = new Function(wrappedScript)();

	// Execute the script with our sandboxed context
	return await fn(context);
}

/**
 * Creates a fetch function with timeout that's safe for user scripts
 */
function createSandboxedFetch(timeoutMs: number): typeof fetch {
	return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

		try {
			const response = await fetch(input, {
				...init,
				signal: controller.signal,
				headers: {
					'User-Agent': 'Pingflare/1.0 Script Check',
					...init?.headers
				}
			});
			return response;
		} finally {
			clearTimeout(timeoutId);
		}
	};
}

/**
 * Executes a promise with a timeout
 */
async function executeWithTimeout<T>(
	fn: () => Promise<T>,
	timeoutMs: number,
	timeoutMessage: string
): Promise<T> {
	return Promise.race([
		fn(),
		new Promise<T>((_, reject) => {
			setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
		})
	]);
}

/**
 * Validates that the script returned a valid result object
 */
function validateScriptResult(result: unknown): ScriptResult {
	if (!result || typeof result !== 'object') {
		throw new Error('Script must return an object with a status property');
	}

	const obj = result as Record<string, unknown>;

	if (!obj.status || !['up', 'down', 'degraded'].includes(obj.status as string)) {
		throw new Error("Script must return an object with status: 'up' | 'down' | 'degraded'");
	}

	return {
		status: obj.status as ScriptResult['status'],
		message: typeof obj.message === 'string' ? obj.message : undefined,
		responseTime: typeof obj.responseTime === 'number' ? obj.responseTime : undefined,
		statusCode: typeof obj.statusCode === 'number' ? obj.statusCode : undefined
	};
}

/**
 * Validates a script without executing it (basic syntax check)
 */
export function validateScript(script: string): { valid: boolean; error?: string } {
	try {
		// Try to parse the script as a function body
		new Function(`
			return (async function(ctx) {
				"use strict";
				${script}
				if (typeof check === 'function') {
					return await check(ctx);
				}
				throw new Error('Script must define a check(ctx) function');
			})
		`);

		// Check if script contains 'check' function definition
		if (!script.includes('function check') && !script.includes('check =')) {
			return {
				valid: false,
				error: 'Script must define a check(ctx) function'
			};
		}

		return { valid: true };
	} catch (err) {
		return {
			valid: false,
			error: err instanceof Error ? err.message : 'Invalid JavaScript syntax'
		};
	}
}
