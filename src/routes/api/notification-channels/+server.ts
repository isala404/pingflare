import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getAllNotificationChannels,
	createNotificationChannel
} from '$lib/server/db/notifications';
import type {
	CreateNotificationChannelInput,
	NotificationChannelType
} from '$lib/types/notification';

const VALID_TYPES: NotificationChannelType[] = ['webhook', 'slack', 'discord', 'webpush'];

export const GET: RequestHandler = async ({ platform, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (!platform?.env?.DB) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const channels = await getAllNotificationChannels(platform.env.DB);
	return json(channels);
};

export const POST: RequestHandler = async ({ request, platform, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (!platform?.env?.DB) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	let input: CreateNotificationChannelInput;
	try {
		input = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	if (!input.name) {
		return json({ error: 'Name is required' }, { status: 400 });
	}

	if (!input.type || !VALID_TYPES.includes(input.type)) {
		return json({ error: `Type must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 });
	}

	if (!input.config) {
		return json({ error: 'Config is required' }, { status: 400 });
	}

	const configError = validateConfig(input.type, input.config);
	if (configError) {
		return json({ error: configError }, { status: 400 });
	}

	try {
		const channel = await createNotificationChannel(platform.env.DB, input);
		return json(channel, { status: 201 });
	} catch (err) {
		console.error('Failed to create notification channel:', err);
		return json({ error: 'Failed to create notification channel' }, { status: 500 });
	}
};

function validateConfig(type: NotificationChannelType, config: unknown): string | null {
	if (typeof config !== 'object' || config === null) {
		return 'Config must be an object';
	}

	const cfg = config as Record<string, unknown>;

	switch (type) {
		case 'slack':
			if (!cfg.webhookUrl || typeof cfg.webhookUrl !== 'string') {
				return 'Slack config requires webhookUrl';
			}
			if (!cfg.webhookUrl.startsWith('https://hooks.slack.com/')) {
				return 'Invalid Slack webhook URL';
			}
			break;

		case 'discord':
			if (!cfg.webhookUrl || typeof cfg.webhookUrl !== 'string') {
				return 'Discord config requires webhookUrl';
			}
			if (!cfg.webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
				return 'Invalid Discord webhook URL';
			}
			break;

		case 'webhook':
			if (!cfg.url || typeof cfg.url !== 'string') {
				return 'Webhook config requires url';
			}
			if (!cfg.method || !['GET', 'POST'].includes(cfg.method as string)) {
				return 'Webhook config requires method (GET or POST)';
			}
			break;

		case 'webpush':
			if (!cfg.label || typeof cfg.label !== 'string') {
				return 'Web push config requires label';
			}
			break;
	}

	return null;
}
