export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';

export type AssertionOperator =
	| 'equals'
	| 'notEquals'
	| 'contains'
	| 'notContains'
	| 'matches'
	| 'greaterThan'
	| 'lessThan'
	| 'greaterOrEqual'
	| 'lessOrEqual'
	| 'exists'
	| 'hasKey'
	| 'hasLength'
	| 'minLength'
	| 'maxLength';

export type AssertionSeverity = 'degraded' | 'down';

export interface Assertion {
	check: string;
	severity?: AssertionSeverity;
	equals?: unknown;
	notEquals?: unknown;
	contains?: string;
	notContains?: string;
	matches?: string;
	greaterThan?: number;
	lessThan?: number;
	greaterOrEqual?: number;
	lessOrEqual?: number;
	exists?: boolean;
	hasKey?: string;
	hasLength?: number;
	minLength?: number;
	maxLength?: number;
}

export interface ScriptStep {
	name: string;
	request: {
		method: HttpMethod;
		url: string;
		headers?: Record<string, string>;
		body?: unknown;
	};
	extract?: Record<string, string>;
	assert?: Assertion[];
}

export interface ScriptDSL {
	steps: ScriptStep[];
	timeout?: number;
}

export function createEmptyStep(name: string = 'step_1'): ScriptStep {
	return {
		name,
		request: {
			method: 'GET',
			url: ''
		}
	};
}

export function createEmptyAssertion(): Assertion {
	return {
		check: 'status',
		equals: 200
	};
}

export function scriptToJson(script: ScriptDSL): string {
	return JSON.stringify(script, null, 2);
}

export function jsonToScript(json: string): ScriptDSL | null {
	try {
		const parsed = JSON.parse(json);
		if (parsed.steps && Array.isArray(parsed.steps)) {
			return parsed as ScriptDSL;
		}
		return null;
	} catch {
		return null;
	}
}

export function getDefaultScript(): ScriptDSL {
	return {
		steps: [
			{
				name: 'health_check',
				request: {
					method: 'GET',
					url: 'https://example.com/health'
				},
				assert: [{ check: 'status', equals: 200 }]
			}
		]
	};
}
