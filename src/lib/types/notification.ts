import type { MonitorStatus } from './monitor';

export type NotificationChannelType = 'webhook' | 'slack' | 'discord' | 'webpush';

export interface SlackConfig {
	webhookUrl: string;
}

export interface DiscordConfig {
	webhookUrl: string;
}

export interface WebhookConfig {
	url: string;
	method: 'POST' | 'GET';
	headers?: Record<string, string>;
	bodyTemplate?: string;
}

export interface WebPushConfig {
	subscriptionId: string | null;
}

export type NotificationChannelConfig = SlackConfig | DiscordConfig | WebhookConfig | WebPushConfig;

export interface NotificationChannel {
	id: string;
	type: NotificationChannelType;
	name: string;
	config: string;
	active: number;
	created_at: string;
}

export interface NotificationChannelWithConfig extends Omit<NotificationChannel, 'config'> {
	config: NotificationChannelConfig;
}

export interface PushSubscription {
	id: string;
	endpoint: string;
	p256dh: string;
	auth: string;
	user_agent: string | null;
	created_at: string;
}

export interface MonitorNotificationSubscription {
	monitor_id: string;
	channel_id: string;
	notify_on: string;
	downtime_threshold_s: number;
}

export interface NotificationPayload {
	monitorId: string;
	monitorName: string;
	status: MonitorStatus;
	previousStatus: MonitorStatus | null;
	url: string | null;
	responseTimeMs: number | null;
	errorMessage: string | null;
	timestamp: string;
	incidentDuration: number | null;
}

export interface CreateNotificationChannelInput {
	type: NotificationChannelType;
	name: string;
	config: NotificationChannelConfig;
	active?: boolean;
}

export interface UpdateNotificationChannelInput {
	name?: string;
	config?: NotificationChannelConfig;
	active?: boolean;
}

export interface MonitorNotificationInput {
	channelId: string;
	notifyOn: ('up' | 'down' | 'degraded')[];
	downtimeThresholdSeconds: number;
}

export interface VapidKeys {
	publicKey: string;
	privateKey: string;
}
