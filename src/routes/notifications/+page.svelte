<script lang="ts">
	import { resolve } from '$app/paths';
	import type { NotificationChannel } from '$lib/types/notification';
	import NotificationChannelForm from '$lib/components/NotificationChannelForm.svelte';
	import NotificationChannelCard from '$lib/components/NotificationChannelCard.svelte';

	let channels = $state<NotificationChannel[]>([]);
	let loading = $state(true);
	let error = $state('');

	let showForm = $state(false);
	let editingChannel: NotificationChannel | null = $state(null);

	async function loadChannels() {
		try {
			const response = await fetch('/api/notification-channels');
			if (!response.ok) {
				throw new Error('Failed to load notification channels');
			}
			channels = await response.json();
			error = '';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load channels';
		} finally {
			loading = false;
		}
	}

	async function handleDelete(id: string) {
		if (!confirm('Are you sure you want to delete this notification channel?')) {
			return;
		}

		try {
			const response = await fetch(`/api/notification-channels/${id}`, { method: 'DELETE' });
			if (!response.ok) {
				throw new Error('Failed to delete channel');
			}
			await loadChannels();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to delete channel';
		}
	}

	async function handleTest(id: string) {
		try {
			const response = await fetch(`/api/notification-channels/${id}/test`, { method: 'POST' });
			const result = (await response.json()) as { error?: string };
			if (!response.ok) {
				throw new Error(result.error ?? 'Failed to send test notification');
			}
			alert('Test notification sent!');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to send test';
		}
	}

	function handleEdit(channel: NotificationChannel) {
		editingChannel = channel;
		showForm = true;
	}

	function handleAddNew() {
		editingChannel = null;
		showForm = true;
	}

	function handleFormClose() {
		showForm = false;
		editingChannel = null;
	}

	async function handleFormSave() {
		showForm = false;
		editingChannel = null;
		await loadChannels();
	}

	$effect(() => {
		loadChannels();
	});
</script>

<div class="min-h-screen bg-gray-50">
	<header class="border-b border-gray-200 bg-white">
		<div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
			<div>
				<h1 class="text-2xl font-bold text-gray-900">Notification Channels</h1>
				<p class="text-sm text-gray-500">Configure where to send alerts</p>
			</div>
			<div class="flex items-center gap-3">
				<a
					href={resolve('/')}
					class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
				>
					Back to Dashboard
				</a>
				<button
					onclick={handleAddNew}
					class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
				>
					Add Channel
				</button>
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
		{#if error}
			<div class="mb-6 rounded-md bg-red-50 p-4 text-red-700">{error}</div>
		{/if}

		{#if loading}
			<div class="flex items-center justify-center py-12">
				<div
					class="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"
				></div>
			</div>
		{:else if channels.length === 0}
			<div class="rounded-lg bg-white p-12 text-center shadow-sm">
				<svg
					class="mx-auto h-12 w-12 text-gray-400"
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
				<h3 class="mt-4 text-lg font-medium text-gray-900">No notification channels</h3>
				<p class="mt-2 text-gray-500">Get started by adding a notification channel.</p>
				<button
					onclick={handleAddNew}
					class="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
				>
					Add Channel
				</button>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
				{#each channels as channel (channel.id)}
					<NotificationChannelCard
						{channel}
						onEdit={() => handleEdit(channel)}
						onDelete={() => handleDelete(channel.id)}
						onTest={() => handleTest(channel.id)}
					/>
				{/each}
			</div>
		{/if}
	</main>
</div>

{#if showForm}
	<NotificationChannelForm
		channel={editingChannel}
		onClose={handleFormClose}
		onSave={handleFormSave}
	/>
{/if}
