import type { NotificationPayload, DiscordConfig } from '$lib/types/notification';

const STATUS_COLORS: Record<string, number> = {
	up: 0x22c55e,
	down: 0xef4444,
	degraded: 0xf59e0b
};

export async function sendDiscordNotification(
	config: DiscordConfig,
	payload: NotificationPayload
): Promise<{ success: boolean; error?: string }> {
	const color = STATUS_COLORS[payload.status] ?? 0x6b7280;

	const isRecovery =
		payload.previousStatus && payload.previousStatus !== 'up' && payload.status === 'up';
	const title = isRecovery
		? `Monitor Recovered: ${payload.monitorName}`
		: `Monitor ${payload.status.toUpperCase()}: ${payload.monitorName}`;

	const fields = [
		{
			name: 'Status',
			value: payload.status.toUpperCase(),
			inline: true
		},
		{
			name: 'Time',
			value: new Date(payload.timestamp).toLocaleString(),
			inline: true
		}
	];

	if (payload.url) {
		fields.push({
			name: 'URL',
			value: payload.url,
			inline: false
		});
	}

	if (payload.responseTimeMs !== null) {
		fields.push({
			name: 'Response Time',
			value: `${payload.responseTimeMs}ms`,
			inline: true
		});
	}

	if (payload.errorMessage) {
		fields.push({
			name: 'Error',
			value: payload.errorMessage.substring(0, 1024),
			inline: false
		});
	}

	if (payload.incidentDuration !== null && isRecovery) {
		fields.push({
			name: 'Downtime',
			value: formatDuration(payload.incidentDuration),
			inline: true
		});
	}

	const discordPayload = {
		embeds: [
			{
				title,
				color,
				fields,
				timestamp: payload.timestamp
			}
		]
	};

	try {
		const response = await fetch(config.webhookUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(discordPayload)
		});

		if (!response.ok) {
			const text = await response.text();
			return { success: false, error: `Discord webhook failed: ${response.status} ${text}` };
		}

		return { success: true };
	} catch (error) {
		return { success: false, error: `Discord webhook error: ${(error as Error).message}` };
	}
}

function formatDuration(seconds: number): string {
	if (seconds < 60) return `${seconds}s`;
	if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	return `${hours}h ${minutes}m`;
}
