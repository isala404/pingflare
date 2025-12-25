<script lang="ts">
	import type { NotificationChannel, NotificationChannelType } from '$lib/types/notification';

	interface Props {
		channel: NotificationChannel;
		onEdit: () => void;
		onDelete: () => void;
		onTest: () => void;
	}

	let { channel, onEdit, onDelete, onTest }: Props = $props();

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
			return cfg.label ?? 'Browser Push';
		}
		return '';
	}
</script>

<div class="rounded-lg bg-white p-4 shadow-sm">
	<div class="flex items-start justify-between">
		<div class="flex items-center gap-3">
			<span
				class="inline-flex h-10 w-10 items-center justify-center rounded-lg text-lg font-semibold {typeColors[
					channel.type
				]}"
			>
				{channel.type.charAt(0).toUpperCase()}
			</span>
			<div>
				<h3 class="font-medium text-gray-900">{channel.name}</h3>
				<div class="flex items-center gap-2">
					<span
						class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium {typeColors[
							channel.type
						]}"
					>
						{typeLabels[channel.type]}
					</span>
					{#if !channel.active}
						<span
							class="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
						>
							Disabled
						</span>
					{/if}
				</div>
			</div>
		</div>
		<div class="flex items-center gap-2">
			<button
				onclick={onTest}
				class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
			>
				Test
			</button>
			<button
				onclick={onEdit}
				class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
			>
				Edit
			</button>
			<button
				onclick={onDelete}
				class="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
			>
				Delete
			</button>
		</div>
	</div>
	<p class="mt-2 truncate text-sm text-gray-500">{getConfigPreview()}</p>
</div>
