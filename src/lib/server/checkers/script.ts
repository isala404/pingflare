import type { MonitorStatus } from '$lib/types/monitor';
import type { ScriptStep, Assertion, ScriptDSL } from '$lib/types/script';

export interface ScriptCheckResult {
	status: MonitorStatus;
	responseTimeMs: number;
	statusCode: number | null;
	errorMessage: string | null;
}

interface AssertionResult {
	passed: boolean;
	message: string;
	severity: 'degraded' | 'down';
}

interface StepResult {
	name: string;
	status: number;
	responseTimeMs: number;
	body: string;
	json: unknown;
	headers: Record<string, string>;
	error: string | null;
	assertions: AssertionResult[];
}

/**
 * Pingflare Health Check DSL
 *
 * A simple JSON-based language for complex health checks.
 *
 * Features:
 * - Chain multiple HTTP requests (GET, POST, PUT, DELETE, PATCH)
 * - Extract values from responses using dot notation
 * - Use variables in URLs, headers, and body with ${varName}
 * - Assert response values with various operators
 *
 * Example:
 * {
 *   "steps": [
 *     {
 *       "name": "login",
 *       "request": {
 *         "method": "POST",
 *         "url": "https://api.example.com/login",
 *         "body": { "user": "test" }
 *       },
 *       "extract": { "token": "json.token" }
 *     },
 *     {
 *       "name": "get_data",
 *       "request": {
 *         "method": "GET",
 *         "url": "https://api.example.com/data",
 *         "headers": { "Authorization": "Bearer ${token}" }
 *       },
 *       "assert": [
 *         { "check": "status", "equals": 200 },
 *         { "check": "json.items.length", "greaterThan": 0 }
 *       ]
 *     }
 *   ]
 * }
 */
export async function executeScript(
	script: string,
	timeoutMs: number = 30000
): Promise<ScriptCheckResult> {
	const startTime = performance.now();

	try {
		// Parse the DSL
		const dsl = parseScript(script);

		// Execute steps
		const variables: Record<string, unknown> = {};
		const results: StepResult[] = [];
		let lastStatusCode: number | null = null;
		let anyRequestFailed = false;
		let hasDownFailure = false;
		let hasDegradedFailure = false;

		for (const step of dsl.steps) {
			const result = await executeStep(step, variables, timeoutMs);
			results.push(result);
			lastStatusCode = result.status;

			if (result.error) {
				anyRequestFailed = true;
				break;
			}

			// Check assertions and track severity
			for (const assertion of result.assertions) {
				if (!assertion.passed) {
					if (assertion.severity === 'down') {
						hasDownFailure = true;
					} else {
						hasDegradedFailure = true;
					}
				}
			}

			// Extract variables for next steps
			if (step.extract && result.json) {
				for (const [varName, path] of Object.entries(step.extract)) {
					variables[varName] = extractValue(result, path);
				}
			}
		}

		const endTime = performance.now();
		const responseTimeMs = Math.round(endTime - startTime);

		// Determine final status
		if (anyRequestFailed) {
			const failedStep = results.find((r) => r.error);
			return {
				status: 'down',
				responseTimeMs,
				statusCode: lastStatusCode,
				errorMessage: `Step "${failedStep?.name}" failed: ${failedStep?.error}`
			};
		}

		if (hasDownFailure || hasDegradedFailure) {
			const failedByStep = results
				.filter((r) => r.assertions.some((a) => !a.passed))
				.map((r) => ({
					step: r.name,
					failures: r.assertions.filter((a) => !a.passed).map((a) => a.message)
				}));

			const totalFailures = failedByStep.reduce((sum, s) => sum + s.failures.length, 0);
			const stepsWithFailures = failedByStep.length;

			// Build concise error message
			let errorMessage = `${totalFailures} assertion${totalFailures !== 1 ? 's' : ''} failed`;
			if (stepsWithFailures > 1) {
				errorMessage += ` in ${stepsWithFailures} steps`;
			}

			// Show first 2 failures as examples
			const examples: string[] = [];
			for (const step of failedByStep) {
				for (const failure of step.failures) {
					if (examples.length < 2) {
						examples.push(`${step.step}: ${failure}`);
					}
				}
				if (examples.length >= 2) break;
			}

			if (examples.length > 0) {
				errorMessage += `: ${examples.join('; ')}`;
				const remaining = totalFailures - examples.length;
				if (remaining > 0) {
					errorMessage += ` (+${remaining} more)`;
				}
			}

			return {
				status: hasDownFailure ? 'down' : 'degraded',
				responseTimeMs,
				statusCode: lastStatusCode,
				errorMessage
			};
		}

		return {
			status: 'up',
			responseTimeMs,
			statusCode: lastStatusCode,
			errorMessage: null
		};
	} catch (err) {
		const endTime = performance.now();
		return {
			status: 'down',
			responseTimeMs: Math.round(endTime - startTime),
			statusCode: null,
			errorMessage: `Script error: ${err instanceof Error ? err.message : 'Unknown error'}`
		};
	}
}

function parseScript(script: string): ScriptDSL {
	const trimmed = script.trim();

	try {
		const parsed = JSON.parse(trimmed);
		if (parsed.steps && Array.isArray(parsed.steps)) {
			return parsed as ScriptDSL;
		}
		throw new Error('Script must have a "steps" array');
	} catch (err) {
		if (err instanceof SyntaxError) {
			throw new Error(`Invalid JSON: ${err.message}`);
		}
		throw err;
	}
}

async function executeStep(
	step: ScriptStep,
	variables: Record<string, unknown>,
	timeoutMs: number
): Promise<StepResult> {
	const startTime = performance.now();

	try {
		// Interpolate variables in URL
		const url = interpolate(step.request.url, variables);

		// Interpolate headers
		const headers: Record<string, string> = {
			'User-Agent': 'Pingflare/1.0 Health Check'
		};
		if (step.request.headers) {
			for (const [key, value] of Object.entries(step.request.headers)) {
				headers[key] = interpolate(value, variables);
			}
		}

		// Interpolate body
		let body: string | undefined;
		if (step.request.body) {
			if (typeof step.request.body === 'string') {
				body = interpolate(step.request.body, variables);
			} else {
				body = JSON.stringify(interpolateObject(step.request.body, variables));
				if (!headers['Content-Type']) {
					headers['Content-Type'] = 'application/json';
				}
			}
		}

		// Make request
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

		const response = await fetch(url, {
			method: step.request.method,
			headers,
			body,
			signal: controller.signal
		});

		clearTimeout(timeoutId);

		const endTime = performance.now();
		const responseText = await response.text();

		let json: unknown = null;
		try {
			json = JSON.parse(responseText);
		} catch {
			// Not JSON
		}

		const responseHeaders: Record<string, string> = {};
		response.headers.forEach((value, key) => {
			responseHeaders[key] = value;
		});

		// Run assertions
		const assertions: AssertionResult[] = [];
		if (step.assert) {
			for (const assertion of step.assert) {
				const result = runAssertion(assertion, {
					status: response.status,
					body: responseText,
					json,
					headers: responseHeaders,
					responseTime: Math.round(endTime - startTime)
				});
				assertions.push(result);
			}
		}

		return {
			name: step.name,
			status: response.status,
			responseTimeMs: Math.round(endTime - startTime),
			body: responseText,
			json,
			headers: responseHeaders,
			error: null,
			assertions
		};
	} catch (err) {
		const endTime = performance.now();
		return {
			name: step.name,
			status: 0,
			responseTimeMs: Math.round(endTime - startTime),
			body: '',
			json: null,
			headers: {},
			error: err instanceof Error ? err.message : 'Request failed',
			assertions: []
		};
	}
}

function interpolate(str: string, variables: Record<string, unknown>): string {
	return str.replace(/\$\{([^}]+)\}/g, (_, varName) => {
		const value = variables[varName.trim()];
		return value !== undefined ? String(value) : `\${${varName}}`;
	});
}

function interpolateObject(obj: unknown, variables: Record<string, unknown>): unknown {
	if (typeof obj === 'string') {
		return interpolate(obj, variables);
	}
	if (Array.isArray(obj)) {
		return obj.map((item) => interpolateObject(item, variables));
	}
	if (obj && typeof obj === 'object') {
		const result: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(obj)) {
			result[key] = interpolateObject(value, variables);
		}
		return result;
	}
	return obj;
}

function extractValue(result: StepResult, path: string): unknown {
	const parts = path.split('.');
	let current: unknown = result;

	for (const part of parts) {
		if (current === null || current === undefined) {
			return undefined;
		}

		// Handle array index
		const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
		if (arrayMatch) {
			const [, key, index] = arrayMatch;
			current = (current as Record<string, unknown>)[key];
			if (Array.isArray(current)) {
				current = current[parseInt(index, 10)];
			}
		} else {
			current = (current as Record<string, unknown>)[part];
		}
	}

	return current;
}

function runAssertion(
	assertion: Assertion,
	context: {
		status: number;
		body: string;
		json: unknown;
		headers: Record<string, string>;
		responseTime: number;
	}
): AssertionResult {
	const severity = assertion.severity ?? 'degraded';
	const value = extractValue(
		{ ...context, responseTimeMs: context.responseTime } as unknown as StepResult,
		assertion.check
	);

	// equals
	if (assertion.equals !== undefined) {
		const passed = value === assertion.equals;
		return {
			passed,
			severity,
			message: passed
				? `${assertion.check} equals ${assertion.equals}`
				: `Expected ${assertion.check} to equal ${assertion.equals}, got ${JSON.stringify(value)}`
		};
	}

	// notEquals
	if (assertion.notEquals !== undefined) {
		const passed = value !== assertion.notEquals;
		return {
			passed,
			severity,
			message: passed
				? `${assertion.check} not equals ${assertion.notEquals}`
				: `Expected ${assertion.check} to not equal ${assertion.notEquals}`
		};
	}

	// contains
	if (assertion.contains !== undefined) {
		const strValue = String(value ?? '');
		const passed = strValue.includes(assertion.contains);
		return {
			passed,
			severity,
			message: passed
				? `${assertion.check} contains "${assertion.contains}"`
				: `Expected ${assertion.check} to contain "${assertion.contains}"`
		};
	}

	// notContains
	if (assertion.notContains !== undefined) {
		const strValue = String(value ?? '');
		const passed = !strValue.includes(assertion.notContains);
		return {
			passed,
			severity,
			message: passed
				? `${assertion.check} does not contain "${assertion.notContains}"`
				: `Expected ${assertion.check} to not contain "${assertion.notContains}"`
		};
	}

	// matches (regex)
	if (assertion.matches !== undefined) {
		const strValue = String(value ?? '');
		const regex = new RegExp(assertion.matches);
		const passed = regex.test(strValue);
		return {
			passed,
			severity,
			message: passed
				? `${assertion.check} matches /${assertion.matches}/`
				: `Expected ${assertion.check} to match /${assertion.matches}/`
		};
	}

	// greaterThan
	if (assertion.greaterThan !== undefined) {
		const numValue = Number(value);
		const passed = !isNaN(numValue) && numValue > assertion.greaterThan;
		return {
			passed,
			severity,
			message: passed
				? `${assertion.check} > ${assertion.greaterThan}`
				: `Expected ${assertion.check} to be > ${assertion.greaterThan}, got ${value}`
		};
	}

	// lessThan
	if (assertion.lessThan !== undefined) {
		const numValue = Number(value);
		const passed = !isNaN(numValue) && numValue < assertion.lessThan;
		return {
			passed,
			severity,
			message: passed
				? `${assertion.check} < ${assertion.lessThan}`
				: `Expected ${assertion.check} to be < ${assertion.lessThan}, got ${value}`
		};
	}

	// greaterOrEqual
	if (assertion.greaterOrEqual !== undefined) {
		const numValue = Number(value);
		const passed = !isNaN(numValue) && numValue >= assertion.greaterOrEqual;
		return {
			passed,
			severity,
			message: passed
				? `${assertion.check} >= ${assertion.greaterOrEqual}`
				: `Expected ${assertion.check} to be >= ${assertion.greaterOrEqual}, got ${value}`
		};
	}

	// lessOrEqual
	if (assertion.lessOrEqual !== undefined) {
		const numValue = Number(value);
		const passed = !isNaN(numValue) && numValue <= assertion.lessOrEqual;
		return {
			passed,
			severity,
			message: passed
				? `${assertion.check} <= ${assertion.lessOrEqual}`
				: `Expected ${assertion.check} to be <= ${assertion.lessOrEqual}, got ${value}`
		};
	}

	// exists
	if (assertion.exists !== undefined) {
		const passed = assertion.exists
			? value !== undefined && value !== null
			: value === undefined || value === null;
		return {
			passed,
			severity,
			message: passed
				? `${assertion.check} ${assertion.exists ? 'exists' : 'does not exist'}`
				: `Expected ${assertion.check} to ${assertion.exists ? 'exist' : 'not exist'}`
		};
	}

	// hasKey
	if (assertion.hasKey !== undefined) {
		const passed =
			value !== null && typeof value === 'object' && assertion.hasKey in (value as object);
		return {
			passed,
			severity,
			message: passed
				? `${assertion.check} has key "${assertion.hasKey}"`
				: `Expected ${assertion.check} to have key "${assertion.hasKey}"`
		};
	}

	// hasLength
	if (assertion.hasLength !== undefined) {
		const length = Array.isArray(value)
			? value.length
			: typeof value === 'string'
				? value.length
				: -1;
		const passed = length === assertion.hasLength;
		return {
			passed,
			severity,
			message: passed
				? `${assertion.check} has length ${assertion.hasLength}`
				: `Expected ${assertion.check} to have length ${assertion.hasLength}, got ${length}`
		};
	}

	// minLength
	if (assertion.minLength !== undefined) {
		const length = Array.isArray(value)
			? value.length
			: typeof value === 'string'
				? value.length
				: -1;
		const passed = length >= assertion.minLength;
		return {
			passed,
			severity,
			message: passed
				? `${assertion.check} has length >= ${assertion.minLength}`
				: `Expected ${assertion.check} to have length >= ${assertion.minLength}, got ${length}`
		};
	}

	// maxLength
	if (assertion.maxLength !== undefined) {
		const length = Array.isArray(value)
			? value.length
			: typeof value === 'string'
				? value.length
				: -1;
		const passed = length <= assertion.maxLength;
		return {
			passed,
			severity,
			message: passed
				? `${assertion.check} has length <= ${assertion.maxLength}`
				: `Expected ${assertion.check} to have length <= ${assertion.maxLength}, got ${length}`
		};
	}

	return { passed: true, severity, message: 'No assertion to check' };
}

/**
 * Validates a script without executing it
 */
export function validateScript(script: string): { valid: boolean; error?: string } {
	try {
		const dsl = parseScript(script);

		if (!dsl.steps || dsl.steps.length === 0) {
			return { valid: false, error: 'Script must have at least one step' };
		}

		for (const step of dsl.steps) {
			if (!step.name) {
				return { valid: false, error: 'Each step must have a name' };
			}
			if (!step.request?.url) {
				return { valid: false, error: `Step "${step.name}" must have a request URL` };
			}
			if (!step.request.method) {
				return { valid: false, error: `Step "${step.name}" must have a request method` };
			}
		}

		return { valid: true };
	} catch (err) {
		return { valid: false, error: err instanceof Error ? err.message : 'Invalid script' };
	}
}
