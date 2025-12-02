import type { Monitor, MonitorStatus } from '$lib/types/monitor';

export interface CheckResult {
	status: MonitorStatus;
	responseTimeMs: number;
	statusCode: number | null;
	errorMessage: string | null;
}

export async function checkHttp(monitor: Monitor): Promise<CheckResult> {
	if (!monitor.url) {
		return {
			status: 'down',
			responseTimeMs: 0,
			statusCode: null,
			errorMessage: 'No URL configured'
		};
	}

	const startTime = performance.now();
	let statusCode: number | null = null;
	let errorMessage: string | null = null;
	let status: MonitorStatus = 'down';

	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), monitor.timeout_ms);

		const response = await fetch(monitor.url, {
			method: monitor.method || 'GET',
			signal: controller.signal,
			headers: {
				'User-Agent': 'Pingflare/1.0 (https://github.com/pingflare)'
			}
		});

		clearTimeout(timeoutId);
		statusCode = response.status;

		const expectedStatus = monitor.expected_status || 200;
		const statusMatch = statusCode === expectedStatus;

		if (monitor.keyword) {
			const text = await response.text();
			const keywordFound = text.includes(monitor.keyword);

			if (monitor.keyword_type === 'present') {
				status = statusMatch && keywordFound ? 'up' : 'down';
				if (!keywordFound) {
					errorMessage = `Keyword "${monitor.keyword}" not found in response`;
				}
			} else if (monitor.keyword_type === 'absent') {
				status = statusMatch && !keywordFound ? 'up' : 'down';
				if (keywordFound) {
					errorMessage = `Keyword "${monitor.keyword}" found in response (expected absent)`;
				}
			} else {
				status = statusMatch ? 'up' : 'down';
			}
		} else {
			status = statusMatch ? 'up' : 'down';
		}

		if (!statusMatch && !errorMessage) {
			errorMessage = `Expected status ${expectedStatus}, got ${statusCode}`;
		}
	} catch (err) {
		if (err instanceof Error) {
			if (err.name === 'AbortError') {
				errorMessage = `Request timeout after ${monitor.timeout_ms}ms`;
			} else {
				errorMessage = err.message;
			}
		} else {
			errorMessage = 'Unknown error occurred';
		}
	}

	const endTime = performance.now();
	const responseTimeMs = Math.round(endTime - startTime);

	return {
		status,
		responseTimeMs,
		statusCode,
		errorMessage
	};
}
