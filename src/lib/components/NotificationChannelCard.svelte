<script lang="ts">
	import type { NotificationChannel, NotificationChannelType } from '$lib/types/notification';
	import { Card, Badge, Button } from '$lib/components/ui';

	interface Props {
		channel: NotificationChannel;
		onEdit: () => void;
		onDelete: () => void;
		onTest: () => Promise<void> | void;
	}

	let { channel, onEdit, onDelete, onTest }: Props = $props();

	let testing = $state(false);

	async function handleTest() {
		testing = true;
		try {
			await onTest();
		} finally {
			testing = false;
		}
	}

	const typeLabels: Record<NotificationChannelType, string> = {
		slack: 'Slack',
		discord: 'Discord',
		webhook: 'Webhook',
		webpush: 'Web Push'
	};

	const typeColors: Record<NotificationChannelType, string> = {
		slack: 'bg-purple-100 text-purple-800',
		discord: 'bg-indigo-100 text-indigo-800',
		webhook: 'bg-gray-100 text-gray-800',
		webpush: 'bg-blue-100 text-blue-800'
	};

	let config = $derived(() => {
		try {
			return JSON.parse(channel.config);
		} catch {
			return {};
		}
	});

	function getConfigPreview(): string {
		const cfg = config();
		if (channel.type === 'slack' || channel.type === 'discord') {
			const url = cfg.webhookUrl ?? '';
			return url.length > 40 ? url.substring(0, 40) + '...' : url;
		}
		if (channel.type === 'webhook') {
			return `${cfg.method ?? 'POST'} ${cfg.url ?? ''}`.substring(0, 40);
		}
		if (channel.type === 'webpush') {
			return 'Browser Push';
		}
		return '';
	}
</script>

<Card>
	<div class="flex items-start justify-between gap-4">
		<div class="flex items-center gap-3 min-w-0">
			<span
				class="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-lg font-semibold {typeColors[
					channel.type
				]}"
			>
				{channel.type.charAt(0).toUpperCase()}
			</span>
			<div class="min-w-0">
				<h3 class="font-medium text-gray-900 truncate">{channel.name}</h3>
				<div class="flex flex-wrap items-center gap-2 mt-1">
					<span
						class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium {typeColors[
							channel.type
						]}"
					>
						{typeLabels[channel.type]}
					</span>
					{#if !channel.active}
						<Badge variant="neutral">Disabled</Badge>
					{/if}
				</div>
			</div>
		</div>
		<div class="flex flex-shrink-0 flex-wrap items-center gap-2">
			<Button size="sm" variant="secondary" onclick={handleTest} loading={testing}>
				{testing ? 'Testing...' : 'Test'}
			</Button>
			<Button size="sm" variant="secondary" onclick={onEdit}>Edit</Button>
			<Button size="sm" variant="danger" onclick={onDelete}>Delete</Button>
		</div>
	</div>
	<p class="mt-3 truncate text-sm text-gray-500">{getConfigPreview()}</p>
</Card>
