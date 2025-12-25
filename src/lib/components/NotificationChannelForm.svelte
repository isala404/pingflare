<script lang="ts">
	import type { NotificationChannel, NotificationChannelType } from '$lib/types/notification';
	import { Card, Input, Select, Button, Alert } from '$lib/components/ui';

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
	let webpushSubscriptionId = $state<string | null>(null);

	// Dynamic placeholder for name based on type
	const namePlaceholders: Record<NotificationChannelType, string> = {
		slack: 'e.g., Slack #devops',
		discord: 'e.g., Discord #alerts',
		webhook: 'e.g., PagerDuty Integration',
		webpush: 'e.g., My Browser'
	};
	let namePlaceholder = $derived(namePlaceholders[type]);

	let saving = $state(false);
	let error = $state('');

	// For editing existing webpush channels, we still show the form
	// (webpush is auto-created when enabling browser notifications)
	const isWebpush = $derived(channel?.type === 'webpush');

	const typeOptions = [
		{ value: 'slack', label: 'Slack' },
		{ value: 'discord', label: 'Discord' },
		{ value: 'webhook', label: 'Generic Webhook' }
		// webpush is intentionally excluded - it's auto-created when enabling browser notifications
	];

	const methodOptions = [
		{ value: 'POST', label: 'POST' },
		{ value: 'GET', label: 'GET' }
	];

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
				} else if (channel.type === 'webpush') {
					webpushSubscriptionId = config.subscriptionId ?? null;
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
					headers: webhookHeaders ? JSON.parse(webhookHeaders) : undefined
				};
			case 'webpush':
				return { subscriptionId: webpushSubscriptionId };
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

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
	onclick={handleBackdropClick}
>
	<Card class="w-full max-w-lg" padding="lg">
		{#snippet header()}
			<div class="flex items-center justify-between">
				<h2 class="text-lg font-semibold text-gray-900">
					{channel ? 'Edit Channel' : 'Add Channel'}
				</h2>
				<button
					type="button"
					onclick={onClose}
					class="rounded-md p-1 text-gray-400 hover:text-gray-600"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>
		{/snippet}

		<form onsubmit={handleSubmit} class="space-y-4">
			{#if error}
				<Alert variant="error" dismissible ondismiss={() => (error = '')}>{error}</Alert>
			{/if}

			<Input
				type="text"
				name="name"
				label="Name"
				placeholder={namePlaceholder}
				bind:value={name}
				required
			/>

			{#if isWebpush}
				<!-- Webpush channels are auto-created, show info instead of type selector -->
				<div class="rounded-lg bg-blue-50 p-3">
					<div class="flex items-center gap-2">
						<svg
							class="h-5 w-5 text-blue-600"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
							/>
						</svg>
						<span class="text-sm font-medium text-blue-800">Browser Push Notification</span>
					</div>
					<p class="mt-1 text-sm text-blue-700">
						This channel was automatically created when push notifications were enabled in a
						browser.
					</p>
				</div>
			{:else}
				<Select
					name="type"
					label="Type"
					options={typeOptions}
					bind:value={type}
					disabled={!!channel}
				/>

				{#if type === 'slack'}
					<Input
						type="url"
						name="slackWebhookUrl"
						label="Webhook URL"
						placeholder="https://hooks.slack.com/services/..."
						bind:value={slackWebhookUrl}
						required
					/>
				{:else if type === 'discord'}
					<Input
						type="url"
						name="discordWebhookUrl"
						label="Webhook URL"
						placeholder="https://discord.com/api/webhooks/..."
						bind:value={discordWebhookUrl}
						required
					/>
				{:else if type === 'webhook'}
					<Input
						type="url"
						name="webhookUrl"
						label="URL"
						placeholder="https://example.com/webhook"
						bind:value={webhookUrl}
						required
					/>
					<Select
						name="webhookMethod"
						label="Method"
						options={methodOptions}
						bind:value={webhookMethod}
					/>
					<div>
						<label for="webhookHeaders" class="block text-sm font-medium text-gray-700"
							>Headers (JSON)</label
						>
						<textarea
							id="webhookHeaders"
							bind:value={webhookHeaders}
							rows={3}
							class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-offset-0"
							placeholder={'{"Authorization": "Bearer token"}'}
						></textarea>
					</div>
				{/if}
			{/if}

			<div class="flex items-center gap-2">
				<input
					type="checkbox"
					id="channelActive"
					bind:checked={active}
					class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
				/>
				<label for="channelActive" class="text-sm font-medium text-gray-700">Active</label>
			</div>

			<div
				class="flex flex-col-reverse gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:justify-end"
			>
				<Button type="button" variant="secondary" onclick={onClose}>Cancel</Button>
				<Button type="submit" loading={saving}>
					{saving ? 'Saving...' : 'Save'}
				</Button>
			</div>
		</form>
	</Card>
</div>
