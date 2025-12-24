import type { Monitor } from '$lib/types/monitor';
import { executeScript, type ScriptCheckResult } from './script';

export type CheckResult = ScriptCheckResult;

export async function runCheck(monitor: Monitor): Promise<CheckResult> {
	if (!monitor.script) {
		return {
			status: 'down',
			responseTimeMs: 0,
			statusCode: null,
			errorMessage: 'No script configured'
		};
	}
	return executeScript(monitor.script, monitor.timeout_ms);
}
