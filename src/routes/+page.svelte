<script lang="ts">
	import type { MonitorWithStatus } from '$lib/types/monitor';
	import type { PageData } from './$types';
	import { AppShell, Container, PageHeader } from '$lib/components/layout';
	import { Card, Button, Spinner, Alert } from '$lib/components/ui';
	import MonitorCard from '$lib/components/MonitorCard.svelte';

	let { data }: { data: PageData } = $props();

	let monitors = $state<MonitorWithStatus[]>([]);
	let loading = $state(true);
	let error = $state('');
	let runningChecks = $state(false);
	let refreshInterval: ReturnType<typeof setInterval> | null = null;

	async function loadMonitors() {
		try {
			const response = await fetch('/api/monitors');
			if (!response.ok) throw new Error('Failed to load monitors');
			monitors = await response.json();
			error = '';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load monitors';
		} finally {
			loading = false;
		}
	}

	async function handleDelete(id: string) {
		if (!confirm('Are you sure you want to delete this monitor?')) return;
		try {
			const response = await fetch(`/api/monitors/${id}`, { method: 'DELETE' });
			if (!response.ok) throw new Error('Failed to delete monitor');
			await loadMonitors();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to delete monitor';
		}
	}

	async function runChecksNow() {
		runningChecks = true;
		try {
			const response = await fetch('/api/cron');
			if (!response.ok) throw new Error('Failed to run checks');
			await loadMonitors();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to run checks';
		} finally {
			runningChecks = false;
		}
	}

	$effect(() => {
		loadMonitors();
		refreshInterval = setInterval(loadMonitors, 30000);
		return () => {
			if (refreshInterval) clearInterval(refreshInterval);
		};
	});

	let upCount = $derived(monitors.filter((m) => m.current_status === 'up').length);
	let downCount = $derived(monitors.filter((m) => m.current_status === 'down').length);
</script>

<AppShell user={data.user}>
	<Container size="xl">
		<PageHeader title="Dashboard" subtitle="Monitor your services in real-time">
			{#snippet actions()}
				<Button variant="secondary" onclick={runChecksNow} loading={runningChecks}>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
						/>
					</svg>
					<span class="hidden sm:inline">Run Checks</span>
				</Button>
				<Button href="/monitors/new">
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 4v16m8-8H4"
						/>
					</svg>
					<span class="hidden sm:inline">Add Monitor</span>
				</Button>
			{/snippet}
		</PageHeader>

		{#if error}
			<div class="mb-6">
				<Alert variant="error" dismissible ondismiss={() => (error = '')}>{error}</Alert>
			</div>
		{/if}

		<!-- Stats Grid -->
		<div class="mb-6 grid grid-cols-3 gap-3 sm:gap-4">
			<Card padding="sm" class="text-center sm:text-left">
				<p class="text-xs text-gray-500 sm:text-sm">Total</p>
				<p class="text-xl font-bold text-gray-900 sm:text-2xl">{monitors.length}</p>
			</Card>
			<Card padding="sm" class="text-center sm:text-left">
				<p class="text-xs text-gray-500 sm:text-sm">Up</p>
				<p class="text-xl font-bold text-green-600 sm:text-2xl">{upCount}</p>
			</Card>
			<Card padding="sm" class="text-center sm:text-left">
				<p class="text-xs text-gray-500 sm:text-sm">Down</p>
				<p class="text-xl font-bold text-red-600 sm:text-2xl">{downCount}</p>
			</Card>
		</div>

		<!-- Monitor List -->
		{#if loading}
			<div class="flex items-center justify-center py-12">
				<Spinner size="lg" />
			</div>
		{:else if monitors.length === 0}
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
						d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
					/>
				</svg>
				<h3 class="mt-4 text-lg font-medium text-gray-900">No monitors yet</h3>
				<p class="mt-2 text-gray-500">Get started by adding your first monitor.</p>
				<div class="mt-4">
					<Button href="/monitors/new">Add Monitor</Button>
				</div>
			</Card>
		{:else}
			<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
				{#each monitors as monitor (monitor.id)}
					<MonitorCard {monitor} onDelete={handleDelete} />
				{/each}
			</div>
		{/if}
	</Container>
</AppShell>
