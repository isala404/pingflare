<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { MonitorWithStatus } from '$lib/types/monitor';
	import type { PageData } from './$types';
	import MonitorCard from '$lib/components/MonitorCard.svelte';
	import PushNotificationToggle from '$lib/components/PushNotificationToggle.svelte';

	let { data }: { data: PageData } = $props();

	let monitors = $state<MonitorWithStatus[]>([]);
	let loading = $state(true);
	let error = $state('');

	let refreshInterval: ReturnType<typeof setInterval> | null = null;

	async function loadMonitors() {
		try {
			const response = await fetch('/api/monitors');
			if (!response.ok) {
				throw new Error('Failed to load monitors');
			}
			monitors = await response.json();
			error = '';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load monitors';
		} finally {
			loading = false;
		}
	}

	async function handleDelete(id: string) {
		if (!confirm('Are you sure you want to delete this monitor?')) {
			return;
		}

		try {
			const response = await fetch(`/api/monitors/${id}`, { method: 'DELETE' });
			if (!response.ok) {
				throw new Error('Failed to delete monitor');
			}
			await loadMonitors();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to delete monitor';
		}
	}

	async function runChecksNow() {
		try {
			const response = await fetch('/api/cron');
			if (!response.ok) {
				throw new Error('Failed to run checks');
			}
			await loadMonitors();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to run checks';
		}
	}

	$effect(() => {
		loadMonitors();
		refreshInterval = setInterval(loadMonitors, 30000);
		return () => {
			if (refreshInterval) {
				clearInterval(refreshInterval);
			}
		};
	});

	let upCount = $derived(monitors.filter((m) => m.current_status === 'up').length);
	let downCount = $derived(monitors.filter((m) => m.current_status === 'down').length);

	let loggingOut = $state(false);

	async function handleLogout() {
		loggingOut = true;
		try {
			await fetch('/api/auth/logout', { method: 'POST' });
			await goto(resolve('/login'));
		} catch {
			error = 'Failed to log out';
		} finally {
			loggingOut = false;
		}
	}
</script>

<div class="min-h-screen bg-gray-50">
	<header class="border-b border-gray-200 bg-white">
		<div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
			<div>
				<h1 class="text-2xl font-bold text-gray-900">Pingflare</h1>
				<p class="text-sm text-gray-500">Uptime Monitoring Dashboard</p>
			</div>
			<div class="flex items-center gap-3">
				<PushNotificationToggle />
				<button
					onclick={runChecksNow}
					class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
				>
					Run Checks Now
				</button>
				<a
					href={resolve('/monitors/new')}
					class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
				>
					Add Monitor
				</a>
				<a
					href={resolve('/notifications')}
					class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
				>
					Notifications
				</a>
				<div class="ml-2 flex items-center gap-2 border-l border-gray-200 pl-4">
					<a href={resolve('/settings')} class="text-sm text-gray-600 hover:text-gray-900">
						{data.user?.name}
					</a>
					<button
						onclick={handleLogout}
						disabled={loggingOut}
						class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
					>
						{loggingOut ? 'Logging out...' : 'Logout'}
					</button>
				</div>
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
		{#if error}
			<div class="mb-6 rounded-md bg-red-50 p-4 text-red-700">{error}</div>
		{/if}

		<div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
			<div class="rounded-lg bg-white p-4 shadow-sm">
				<p class="text-sm text-gray-500">Total Monitors</p>
				<p class="text-2xl font-bold text-gray-900">{monitors.length}</p>
			</div>
			<div class="rounded-lg bg-white p-4 shadow-sm">
				<p class="text-sm text-gray-500">Up</p>
				<p class="text-2xl font-bold text-green-600">{upCount}</p>
			</div>
			<div class="rounded-lg bg-white p-4 shadow-sm">
				<p class="text-sm text-gray-500">Down</p>
				<p class="text-2xl font-bold text-red-600">{downCount}</p>
			</div>
		</div>

		{#if loading}
			<div class="flex items-center justify-center py-12">
				<div
					class="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"
				></div>
			</div>
		{:else if monitors.length === 0}
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
						d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
					/>
				</svg>
				<h3 class="mt-4 text-lg font-medium text-gray-900">No monitors yet</h3>
				<p class="mt-2 text-gray-500">Get started by adding your first monitor.</p>
				<a
					href={resolve('/monitors/new')}
					class="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
				>
					Add Monitor
				</a>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
				{#each monitors as monitor (monitor.id)}
					<MonitorCard {monitor} onDelete={handleDelete} />
				{/each}
			</div>
		{/if}
	</main>
</div>
