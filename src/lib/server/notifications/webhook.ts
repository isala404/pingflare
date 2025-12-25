import type { NotificationPayload, WebhookConfig } from '$lib/types/notification';

export async function sendWebhookNotification(
	config: WebhookConfig,
	payload: NotificationPayload
): Promise<{ success: boolean; error?: string }> {
	const variables: Record<string, string> = {
		'{{monitor_name}}': payload.monitorName,
		'{{monitor_id}}': payload.monitorId,
		'{{status}}': payload.status,
		'{{previous_status}}': payload.previousStatus ?? '',
		'{{url}}': payload.url ?? '',
		'{{response_time_ms}}': payload.responseTimeMs?.toString() ?? '',
		'{{error}}': payload.errorMessage ?? '',
		'{{timestamp}}': payload.timestamp,
		'{{incident_duration}}': payload.incidentDuration?.toString() ?? ''
	};

	let body: string;
	if (config.bodyTemplate) {
		body = substituteVariables(config.bodyTemplate, variables);
	} else {
		body = JSON.stringify({
			monitor_name: payload.monitorName,
			monitor_id: payload.monitorId,
			status: payload.status,
			previous_status: payload.previousStatus,
			url: payload.url,
			response_time_ms: payload.responseTimeMs,
			error: payload.errorMessage,
			timestamp: payload.timestamp,
			incident_duration: payload.incidentDuration
		});
	}

	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		...config.headers
	};

	Object.keys(headers).forEach((key) => {
		headers[key] = substituteVariables(headers[key], variables);
	});

	const url = substituteVariables(config.url, variables);

	try {
		const response = await fetch(url, {
			method: config.method,
			headers,
			body: config.method === 'POST' ? body : undefined
		});

		if (!response.ok) {
			const text = await response.text();
			return { success: false, error: `Webhook failed: ${response.status} ${text}` };
		}

		return { success: true };
	} catch (error) {
		return { success: false, error: `Webhook error: ${(error as Error).message}` };
	}
}

function substituteVariables(template: string, variables: Record<string, string>): string {
	let result = template;
	for (const [key, value] of Object.entries(variables)) {
		result = result.replaceAll(key, value);
	}
	return result;
}
