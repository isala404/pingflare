import type {
	NotificationChannel,
	NotificationChannelConfig,
	CreateNotificationChannelInput,
	UpdateNotificationChannelInput,
	PushSubscription,
	MonitorNotificationSubscription,
	MonitorNotificationInput,
	VapidKeys
} from '$lib/types/notification';

function generateId(): string {
	return crypto.randomUUID();
}

export async function getAllNotificationChannels(db: D1Database): Promise<NotificationChannel[]> {
	const result = await db
		.prepare('SELECT * FROM notification_channels ORDER BY created_at DESC')
		.all<NotificationChannel>();
	return result.results;
}

export async function getActiveNotificationChannels(
	db: D1Database
): Promise<NotificationChannel[]> {
	const result = await db
		.prepare('SELECT * FROM notification_channels WHERE active = 1 ORDER BY created_at DESC')
		.all<NotificationChannel>();
	return result.results;
}

export async function getNotificationChannelById(
	db: D1Database,
	id: string
): Promise<NotificationChannel | null> {
	return db
		.prepare('SELECT * FROM notification_channels WHERE id = ?')
		.bind(id)
		.first<NotificationChannel>();
}

export async function createNotificationChannel(
	db: D1Database,
	input: CreateNotificationChannelInput
): Promise<NotificationChannel> {
	const id = generateId();
	const now = new Date().toISOString();

	await db
		.prepare(
			`INSERT INTO notification_channels (id, type, name, config, active, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
		)
		.bind(
			id,
			input.type,
			input.name,
			JSON.stringify(input.config),
			input.active !== false ? 1 : 0,
			now
		)
		.run();

	const channel = await getNotificationChannelById(db, id);
	if (!channel) {
		throw new Error('Failed to create notification channel');
	}
	return channel;
}

export async function updateNotificationChannel(
	db: D1Database,
	id: string,
	input: UpdateNotificationChannelInput
): Promise<NotificationChannel | null> {
	const existing = await getNotificationChannelById(db, id);
	if (!existing) {
		return null;
	}

	const updates: string[] = [];
	const values: (string | number)[] = [];

	if (input.name !== undefined) {
		updates.push('name = ?');
		values.push(input.name);
	}
	if (input.config !== undefined) {
		updates.push('config = ?');
		values.push(JSON.stringify(input.config));
	}
	if (input.active !== undefined) {
		updates.push('active = ?');
		values.push(input.active ? 1 : 0);
	}

	if (updates.length === 0) {
		return existing;
	}

	values.push(id);

	await db
		.prepare(`UPDATE notification_channels SET ${updates.join(', ')} WHERE id = ?`)
		.bind(...values)
		.run();

	return getNotificationChannelById(db, id);
}

export async function deleteNotificationChannel(db: D1Database, id: string): Promise<boolean> {
	const result = await db.prepare('DELETE FROM notification_channels WHERE id = ?').bind(id).run();
	return result.meta.changes > 0;
}

export async function getChannelsForMonitor(
	db: D1Database,
	monitorId: string
): Promise<(NotificationChannel & { notify_on: string; downtime_threshold_s: number })[]> {
	const result = await db
		.prepare(
			`SELECT nc.*, mn.notify_on, mn.downtime_threshold_s
       FROM notification_channels nc
       INNER JOIN monitor_notifications mn ON nc.id = mn.channel_id
       WHERE mn.monitor_id = ?`
		)
		.bind(monitorId)
		.all<NotificationChannel & { notify_on: string; downtime_threshold_s: number }>();
	return result.results;
}

export async function getMonitorNotifications(
	db: D1Database,
	monitorId: string
): Promise<MonitorNotificationSubscription[]> {
	const result = await db
		.prepare('SELECT * FROM monitor_notifications WHERE monitor_id = ?')
		.bind(monitorId)
		.all<MonitorNotificationSubscription>();
	return result.results;
}

export async function setMonitorNotifications(
	db: D1Database,
	monitorId: string,
	notifications: MonitorNotificationInput[]
): Promise<void> {
	await db.prepare('DELETE FROM monitor_notifications WHERE monitor_id = ?').bind(monitorId).run();

	for (const n of notifications) {
		await db
			.prepare(
				`INSERT INTO monitor_notifications (monitor_id, channel_id, notify_on, downtime_threshold_s)
         VALUES (?, ?, ?, ?)`
			)
			.bind(monitorId, n.channelId, n.notifyOn.join(','), n.downtimeThresholdSeconds)
			.run();
	}
}

export async function getPushSubscriptions(db: D1Database): Promise<PushSubscription[]> {
	const result = await db
		.prepare('SELECT * FROM push_subscriptions ORDER BY created_at DESC')
		.all<PushSubscription>();
	return result.results;
}

export async function getPushSubscriptionByEndpoint(
	db: D1Database,
	endpoint: string
): Promise<PushSubscription | null> {
	return db
		.prepare('SELECT * FROM push_subscriptions WHERE endpoint = ?')
		.bind(endpoint)
		.first<PushSubscription>();
}

export async function addPushSubscription(
	db: D1Database,
	subscription: { endpoint: string; p256dh: string; auth: string; userAgent?: string }
): Promise<PushSubscription> {
	const existing = await getPushSubscriptionByEndpoint(db, subscription.endpoint);
	if (existing) {
		await db
			.prepare('UPDATE push_subscriptions SET p256dh = ?, auth = ?, user_agent = ? WHERE id = ?')
			.bind(subscription.p256dh, subscription.auth, subscription.userAgent ?? null, existing.id)
			.run();
		return (await getPushSubscriptionByEndpoint(db, subscription.endpoint))!;
	}

	const id = generateId();
	const now = new Date().toISOString();

	await db
		.prepare(
			`INSERT INTO push_subscriptions (id, endpoint, p256dh, auth, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
		)
		.bind(
			id,
			subscription.endpoint,
			subscription.p256dh,
			subscription.auth,
			subscription.userAgent ?? null,
			now
		)
		.run();

	return (await getPushSubscriptionByEndpoint(db, subscription.endpoint))!;
}

export async function removePushSubscription(db: D1Database, endpoint: string): Promise<boolean> {
	const result = await db
		.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?')
		.bind(endpoint)
		.run();
	return result.meta.changes > 0;
}

export async function getVapidKeys(db: D1Database): Promise<VapidKeys | null> {
	const publicKey = await db
		.prepare("SELECT value FROM app_settings WHERE key = 'vapid_public_key'")
		.first<{ value: string }>();
	const privateKey = await db
		.prepare("SELECT value FROM app_settings WHERE key = 'vapid_private_key'")
		.first<{ value: string }>();

	if (!publicKey || !privateKey) {
		return null;
	}

	return {
		publicKey: publicKey.value,
		privateKey: privateKey.value
	};
}

export async function setVapidKeys(db: D1Database, keys: VapidKeys): Promise<void> {
	const now = new Date().toISOString();

	await db
		.prepare(
			`INSERT INTO app_settings (key, value, updated_at) VALUES ('vapid_public_key', ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
		)
		.bind(keys.publicKey, now)
		.run();

	await db
		.prepare(
			`INSERT INTO app_settings (key, value, updated_at) VALUES ('vapid_private_key', ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
		)
		.bind(keys.privateKey, now)
		.run();
}

export function parseChannelConfig(channel: NotificationChannel): NotificationChannelConfig {
	return JSON.parse(channel.config) as NotificationChannelConfig;
}
