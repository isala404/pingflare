<script lang="ts">
	import type { NotificationChannel } from '$lib/types/notification';
	import type { PageData } from './$types';
	import NotificationChannelForm from '$lib/components/NotificationChannelForm.svelte';
	import NotificationChannelCard from '$lib/components/NotificationChannelCard.svelte';
	import PushNotificationToggle from '$lib/components/PushNotificationToggle.svelte';
	import { AppShell, Container, PageHeader } from '$lib/components/layout';
	import { Card, Button, Spinner, Alert } from '$lib/components/ui';

	let { data }: { data: PageData } = $props();

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

<svelte:head>
	<title>Notifications - Pingflare</title>
</svelte:head>

<AppShell user={data.user}>
	<Container size="xl">
		<PageHeader title="Notification Channels" subtitle="Configure where to send alerts">
			{#snippet actions()}
				<Button onclick={handleAddNew}>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 4v16m8-8H4"
						/>
					</svg>
					<span class="hidden sm:inline">Add Channel</span>
				</Button>
			{/snippet}
		</PageHeader>

		{#if error}
			<div class="mb-6">
				<Alert variant="error" dismissible ondismiss={() => (error = '')}>{error}</Alert>
			</div>
		{/if}

		<!-- Browser Push Notifications -->
		<Card class="mb-6">
			<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h3 class="font-medium text-gray-900">Browser Notifications</h3>
					<p class="text-sm text-gray-500">Receive push notifications in this browser</p>
				</div>
				<PushNotificationToggle onSubscriptionChange={loadChannels} />
			</div>
		</Card>

		{#if loading}
			<div class="flex items-center justify-center py-12">
				<Spinner size="lg" />
			</div>
		{:else if channels.length === 0}
			<Card class="py-12 text-center">
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
				<div class="mt-4">
					<Button onclick={handleAddNew}>Add Channel</Button>
				</div>
			</Card>
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
	</Container>
</AppShell>

{#if showForm}
	<NotificationChannelForm
		channel={editingChannel}
		onClose={handleFormClose}
		onSave={handleFormSave}
	/>
{/if}
