import type { NotificationPayload, SlackConfig } from '$lib/types/notification';

const STATUS_COLORS: Record<string, string> = {
	up: '#22c55e',
	down: '#ef4444',
	degraded: '#f59e0b'
};

const STATUS_EMOJI: Record<string, string> = {
	up: ':white_check_mark:',
	down: ':x:',
	degraded: ':warning:'
};

export async function sendSlackNotification(
	config: SlackConfig,
	payload: NotificationPayload
): Promise<{ success: boolean; error?: string }> {
	const color = STATUS_COLORS[payload.status] ?? '#6b7280';
	const emoji = STATUS_EMOJI[payload.status] ?? ':question:';

	const isRecovery =
		payload.previousStatus && payload.previousStatus !== 'up' && payload.status === 'up';
	const title = isRecovery
		? `${emoji} Monitor Recovered: ${payload.monitorName}`
		: `${emoji} Monitor ${payload.status.toUpperCase()}: ${payload.monitorName}`;

	const fields = [
		{
			type: 'mrkdwn',
			text: `*Status:* ${payload.status.toUpperCase()}`
		},
		{
			type: 'mrkdwn',
			text: `*Time:* ${new Date(payload.timestamp).toLocaleString()}`
		}
	];

	if (payload.url) {
		fields.push({
			type: 'mrkdwn',
			text: `*URL:* ${payload.url}`
		});
	}

	if (payload.responseTimeMs !== null) {
		fields.push({
			type: 'mrkdwn',
			text: `*Response Time:* ${payload.responseTimeMs}ms`
		});
	}

	if (payload.errorMessage) {
		fields.push({
			type: 'mrkdwn',
			text: `*Error:* ${payload.errorMessage}`
		});
	}

	if (payload.incidentDuration !== null && isRecovery) {
		const duration = formatDuration(payload.incidentDuration);
		fields.push({
			type: 'mrkdwn',
			text: `*Downtime:* ${duration}`
		});
	}

	const slackPayload = {
		attachments: [
			{
				color,
				blocks: [
					{
						type: 'section',
						text: {
							type: 'mrkdwn',
							text: title
						}
					},
					{
						type: 'section',
						fields
					}
				]
			}
		]
	};

	try {
		const response = await fetch(config.webhookUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(slackPayload)
		});

		if (!response.ok) {
			const text = await response.text();
			return { success: false, error: `Slack webhook failed: ${response.status} ${text}` };
		}

		return { success: true };
	} catch (error) {
		return { success: false, error: `Slack webhook error: ${(error as Error).message}` };
	}
}

function formatDuration(seconds: number): string {
	if (seconds < 60) return `${seconds}s`;
	if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	return `${hours}h ${minutes}m`;
}
