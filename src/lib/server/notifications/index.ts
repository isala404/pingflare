import type { Monitor, MonitorStatus } from '$lib/types/monitor';
import type { Incident } from '$lib/types/status';
import type {
	NotificationChannel,
	NotificationPayload,
	SlackConfig,
	DiscordConfig,
	WebhookConfig
} from '$lib/types/notification';
import {
	getChannelsForMonitor,
	getPushSubscriptions,
	getVapidKeys,
	parseChannelConfig,
	removePushSubscription
} from '$lib/server/db/notifications';
import { sendSlackNotification } from './slack';
import { sendDiscordNotification } from './discord';
import { sendWebhookNotification } from './webhook';
import { sendWebPushNotifications } from './webpush';

interface SendNotificationsResult {
	sent: number;
	failed: number;
	errors: string[];
}

export async function sendNotifications(
	db: D1Database,
	monitor: Monitor,
	oldStatus: MonitorStatus | null,
	newStatus: MonitorStatus,
	incident: Incident | null,
	applicationServerUrl: string
): Promise<SendNotificationsResult> {
	const channels = await getChannelsForMonitor(db, monitor.id);
	if (channels.length === 0) {
		return { sent: 0, failed: 0, errors: [] };
	}

	const payload = buildPayload(monitor, oldStatus, newStatus, incident);
	const result: SendNotificationsResult = { sent: 0, failed: 0, errors: [] };

	const sendPromises = channels
		.filter((channel) => shouldNotify(channel, newStatus, incident))
		.map(async (channel) => {
			try {
				const sendResult = await sendToChannel(db, channel, payload, applicationServerUrl);
				if (sendResult.success) {
					result.sent++;
				} else {
					result.failed++;
					if (sendResult.error) {
						result.errors.push(`${channel.name}: ${sendResult.error}`);
					}
				}
			} catch (error) {
				result.failed++;
				result.errors.push(`${channel.name}: ${(error as Error).message}`);
			}
		});

	await Promise.allSettled(sendPromises);

	return result;
}

function shouldNotify(
	channel: NotificationChannel & { notify_on: string; downtime_threshold_s: number },
	newStatus: MonitorStatus,
	incident: Incident | null
): boolean {
	if (!channel.active) {
		return false;
	}

	const notifyOn = channel.notify_on.split(',').map((s) => s.trim());
	if (!notifyOn.includes(newStatus)) {
		return false;
	}

	if (newStatus === 'down' && channel.downtime_threshold_s > 0 && incident) {
		const downtimeSeconds = Math.floor(
			(Date.now() - new Date(incident.created_at).getTime()) / 1000
		);
		if (downtimeSeconds < channel.downtime_threshold_s) {
			return false;
		}
	}

	return true;
}

function buildPayload(
	monitor: Monitor,
	oldStatus: MonitorStatus | null,
	newStatus: MonitorStatus,
	incident: Incident | null
): NotificationPayload {
	let url: string | null = null;
	try {
		const script = JSON.parse(monitor.script);
		if (script.steps?.[0]?.url) {
			url = script.steps[0].url;
		}
	} catch {
		// Ignore parse errors
	}

	return {
		monitorId: monitor.id,
		monitorName: monitor.name,
		status: newStatus,
		previousStatus: oldStatus,
		url,
		responseTimeMs: null,
		errorMessage: null,
		timestamp: new Date().toISOString(),
		incidentDuration: incident?.resolved_at
			? Math.floor(
					(new Date(incident.resolved_at).getTime() - new Date(incident.created_at).getTime()) /
						1000
				)
			: null
	};
}

async function sendToChannel(
	db: D1Database,
	channel: NotificationChannel,
	payload: NotificationPayload,
	applicationServerUrl: string
): Promise<{ success: boolean; error?: string }> {
	const config = parseChannelConfig(channel);

	switch (channel.type) {
		case 'slack':
			return sendSlackNotification(config as SlackConfig, payload);

		case 'discord':
			return sendDiscordNotification(config as DiscordConfig, payload);

		case 'webhook':
			return sendWebhookNotification(config as WebhookConfig, payload);

		case 'webpush': {
			const subscriptions = await getPushSubscriptions(db);
			const vapidKeys = await getVapidKeys(db);
			if (!vapidKeys) {
				return { success: false, error: 'VAPID keys not configured' };
			}
			const result = await sendWebPushNotifications(
				subscriptions,
				payload,
				vapidKeys,
				applicationServerUrl
			);

			// Clean up expired/invalid subscriptions
			if (result.invalidSubscriptions && result.invalidSubscriptions.length > 0) {
				for (const endpoint of result.invalidSubscriptions) {
					await removePushSubscription(db, endpoint);
				}
			}

			// Consider success if at least some notifications went through
			const totalSent = subscriptions.length - (result.invalidSubscriptions?.length ?? 0);
			const hasValidSends = totalSent > 0 || subscriptions.length === 0;

			return {
				success: hasValidSends,
				error: result.error
			};
		}

		default:
			return { success: false, error: `Unknown channel type: ${channel.type}` };
	}
}

export async function sendTestNotification(
	db: D1Database,
	channel: NotificationChannel,
	applicationServerUrl: string
): Promise<{ success: boolean; error?: string }> {
	const testPayload: NotificationPayload = {
		monitorId: 'test-monitor-id',
		monitorName: 'Test Monitor',
		status: 'down',
		previousStatus: 'up',
		url: 'https://example.com/health',
		responseTimeMs: 1234,
		errorMessage: 'This is a test notification',
		timestamp: new Date().toISOString(),
		incidentDuration: null
	};

	return sendToChannel(db, channel, testPayload, applicationServerUrl);
}
