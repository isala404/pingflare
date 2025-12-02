import type { Monitor } from '$lib/types/monitor';
import { checkHttp, type CheckResult } from './http';

export async function runCheck(monitor: Monitor): Promise<CheckResult> {
	switch (monitor.type) {
		case 'http':
			return checkHttp(monitor);
		case 'tcp':
			// TODO: Implement TCP checker using connect() API
			return {
				status: 'down',
				responseTimeMs: 0,
				statusCode: null,
				errorMessage: 'TCP monitoring not yet implemented'
			};
		case 'dns':
			// TODO: Implement DNS checker
			return {
				status: 'down',
				responseTimeMs: 0,
				statusCode: null,
				errorMessage: 'DNS monitoring not yet implemented'
			};
		case 'push':
			// Push monitors are passive - they wait for external pings
			return {
				status: 'down',
				responseTimeMs: 0,
				statusCode: null,
				errorMessage: 'Push monitors are checked differently'
			};
		default:
			return {
				status: 'down',
				responseTimeMs: 0,
				statusCode: null,
				errorMessage: `Unknown monitor type: ${monitor.type}`
			};
	}
}

export type { CheckResult };
