<script lang="ts">
	import type { NotificationChannel, NotificationChannelType } from '$lib/types/notification';
	import Modal from './Modal.svelte';

	interface Props {
		channel: NotificationChannel | null;
		onClose: () => void;
		onSave: () => void;
	}

	let { channel, onClose, onSave }: Props = $props();

	let name = $state(channel?.name ?? '');
	let type: NotificationChannelType = $state((channel?.type as NotificationChannelType) ?? 'slack');
	let active = $state(channel?.active !== 0);

	let slackWebhookUrl = $state('');
	let discordWebhookUrl = $state('');
	let webhookUrl = $state('');
	let webhookMethod: 'GET' | 'POST' = $state('POST');
	let webhookHeaders = $state('');
	let webhookBodyTemplate = $state('');
	let webpushLabel = $state('');

	let saving = $state(false);
	let error = $state('');

	$effect(() => {
		if (channel) {
			try {
				const config = JSON.parse(channel.config);
				if (channel.type === 'slack') {
					slackWebhookUrl = config.webhookUrl ?? '';
				} else if (channel.type === 'discord') {
					discordWebhookUrl = config.webhookUrl ?? '';
				} else if (channel.type === 'webhook') {
					webhookUrl = config.url ?? '';
					webhookMethod = config.method ?? 'POST';
					webhookHeaders = config.headers ? JSON.stringify(config.headers, null, 2) : '';
					webhookBodyTemplate = config.bodyTemplate ?? '';
				} else if (channel.type === 'webpush') {
					webpushLabel = config.label ?? '';
				}
			} catch {
				// Ignore parse errors
			}
		}
	});

	function buildConfig() {
		switch (type) {
			case 'slack':
				return { webhookUrl: slackWebhookUrl };
			case 'discord':
				return { webhookUrl: discordWebhookUrl };
			case 'webhook':
				return {
					url: webhookUrl,
					method: webhookMethod,
					headers: webhookHeaders ? JSON.parse(webhookHeaders) : undefined,
					bodyTemplate: webhookBodyTemplate || undefined
				};
			case 'webpush':
				return { label: webpushLabel };
		}
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		saving = true;
		error = '';

		try {
			const config = buildConfig();
			const body = { name, type, config, active };

			const url = channel
				? `/api/notification-channels/${channel.id}`
				: '/api/notification-channels';
			const method = channel ? 'PUT' : 'POST';

			const response = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});

			if (!response.ok) {
				const data = (await response.json()) as { error?: string };
				throw new Error(data.error ?? 'Failed to save channel');
			}

			onSave();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to save';
		} finally {
			saving = false;
		}
	}
</script>

<Modal open={true} title={channel ? 'Edit Channel' : 'Add Channel'} {onClose}>
		<form onsubmit={handleSubmit} class="space-y-4">
			{#if error}
				<div class="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
			{/if}

			<div>
				<label for="name" class="block text-sm font-medium text-gray-700">Name</label>
				<input
					type="text"
					id="name"
					bind:value={name}
					required
					class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
					placeholder="e.g., Slack #devops"
				/>
			</div>

			<div>
				<label for="type" class="block text-sm font-medium text-gray-700">Type</label>
				<select
					id="type"
					bind:value={type}
					disabled={!!channel}
					class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
				>
					<option value="slack">Slack</option>
					<option value="discord">Discord</option>
					<option value="webhook">Generic Webhook</option>
					<option value="webpush">Web Push</option>
				</select>
			</div>

			{#if type === 'slack'}
				<div>
					<label for="slackWebhookUrl" class="block text-sm font-medium text-gray-700"
						>Webhook URL</label
					>
					<input
						type="url"
						id="slackWebhookUrl"
						bind:value={slackWebhookUrl}
						required
						class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
						placeholder="https://hooks.slack.com/services/..."
					/>
				</div>
			{:else if type === 'discord'}
				<div>
					<label for="discordWebhookUrl" class="block text-sm font-medium text-gray-700"
						>Webhook URL</label
					>
					<input
						type="url"
						id="discordWebhookUrl"
						bind:value={discordWebhookUrl}
						required
						class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
						placeholder="https://discord.com/api/webhooks/..."
					/>
				</div>
			{:else if type === 'webhook'}
				<div>
					<label for="webhookUrl" class="block text-sm font-medium text-gray-700">URL</label>
					<input
						type="url"
						id="webhookUrl"
						bind:value={webhookUrl}
						required
						class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
						placeholder="https://example.com/webhook"
					/>
				</div>
				<div>
					<label for="webhookMethod" class="block text-sm font-medium text-gray-700">Method</label>
					<select
						id="webhookMethod"
						bind:value={webhookMethod}
						class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
					>
						<option value="POST">POST</option>
						<option value="GET">GET</option>
					</select>
				</div>
				<div>
					<label for="webhookHeaders" class="block text-sm font-medium text-gray-700"
						>Headers (JSON)</label
					>
					<textarea
						id="webhookHeaders"
						bind:value={webhookHeaders}
						rows={3}
						class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
						placeholder={'{"Authorization": "Bearer token"}'}
					></textarea>
				</div>
				<div>
					<label for="webhookBodyTemplate" class="block text-sm font-medium text-gray-700"
						>Body Template</label
					>
					<textarea
						id="webhookBodyTemplate"
						bind:value={webhookBodyTemplate}
						rows={4}
						class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
						placeholder={'{"monitor": "{{monitor_name}}", "status": "{{status}}"}'}
					></textarea>
					<p class="mt-1 text-xs text-gray-500">
						Variables: {'{{monitor_name}}, {{status}}, {{url}}, {{error}}, {{timestamp}}'}
					</p>
				</div>
			{:else if type === 'webpush'}
				<div>
					<label for="webpushLabel" class="block text-sm font-medium text-gray-700">Label</label>
					<input
						type="text"
						id="webpushLabel"
						bind:value={webpushLabel}
						required
						class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
						placeholder="e.g., Browser Notifications"
					/>
				</div>
			{/if}

			<div class="flex items-center">
				<input
					type="checkbox"
					id="active"
					bind:checked={active}
					class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
				/>
				<label for="active" class="ml-2 text-sm text-gray-700">Active</label>
			</div>

			<div class="flex justify-end gap-3 border-t border-gray-200 pt-4">
				<button
					type="button"
					onclick={onClose}
					class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={saving}
					class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
				>
					{saving ? 'Saving...' : 'Save'}
				</button>
			</div>
		</form>
</Modal>
