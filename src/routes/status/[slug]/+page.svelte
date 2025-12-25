<script lang="ts">
	import type { PageData } from './$types';
	import { getOverallStatusText, getOverallStatusColor } from '$lib/types/status';
	import PublicLayout from '$lib/components/layout/PublicLayout.svelte';
	import UptimeBars from '$lib/components/UptimeBars.svelte';

	let { data }: { data: PageData } = $props();

	const statusText = $derived(getOverallStatusText(data.group.overall_status));
	const statusColor = $derived(getOverallStatusColor(data.group.overall_status));

	function formatIncidentTime(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			timeZoneName: 'short'
		});
	}

	function getStatusLabel(status: string): string {
		return status.charAt(0).toUpperCase() + status.slice(1);
	}
</script>

<svelte:head>
	<title>{data.group.name} Status</title>
</svelte:head>

<PublicLayout>
	<!-- Back link -->
	<a
		href="/status"
		class="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
	>
		<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
		</svg>
		Back to all groups
	</a>

	<!-- Group Status Banner -->
	<div class="mb-8 rounded-lg p-6 text-white {statusColor}">
		<h1 class="text-2xl font-bold">{data.group.name}</h1>
		<p class="mt-1 text-lg opacity-90">{statusText}</p>
		{#if data.group.description}
			<p class="mt-2 text-sm opacity-75">{data.group.description}</p>
		{/if}
	</div>

	<!-- Active Incidents -->
	{#if data.activeIncidents.length > 0}
		<div class="mb-8">
			{#each data.activeIncidents as incident}
				<div class="mb-4 rounded-lg border-l-4 border-orange-400 bg-orange-50 p-4">
					<h3 class="font-semibold text-orange-700">{incident.title}</h3>
					{#if incident.updates.length > 0}
						<p class="mt-1 text-sm text-gray-600">
							<span class="font-medium">{getStatusLabel(incident.updates[0].status)}</span> - {incident
								.updates[0].message}
						</p>
						<p class="mt-1 text-xs text-gray-500">
							{formatIncidentTime(incident.updates[0].created_at)}
						</p>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	<!-- Monitors with Uptime Bars -->
	<div class="mb-8">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-lg font-semibold text-gray-900">Monitors</h2>
			<p class="text-sm text-gray-500">Uptime over the past 90 days</p>
		</div>

		{#if data.group.monitors.length > 0}
			<div class="rounded-lg border border-gray-200 bg-white p-4">
				<div class="divide-y divide-gray-100">
					{#each data.group.monitors as monitor}
						<div class="py-3 first:pt-0 last:pb-0">
							<UptimeBars
								name={monitor.name}
								days={monitor.daily_status}
								uptimePercent={monitor.uptime_90d}
								currentStatus={monitor.current_status}
							/>
						</div>
					{/each}
				</div>
			</div>
		{:else}
			<div class="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
				No monitors in this group.
			</div>
		{/if}
	</div>

	<!-- Past Incidents -->
	<div class="mt-12">
		<h2 class="mb-6 text-2xl font-bold text-gray-900">Past Incidents</h2>

		{#each data.pastIncidents as day}
			<div class="mb-6">
				<h3 class="border-b border-gray-200 pb-2 text-lg font-semibold text-gray-900">
					{day.dateFormatted}
				</h3>
				{#if day.incidents.length === 0}
					<p class="mt-2 text-sm text-gray-500">No incidents reported.</p>
				{:else}
					{#each day.incidents as incident}
						<div class="mt-4">
							<h4 class="text-lg font-medium text-orange-600">{incident.title}</h4>
							<div class="mt-2 space-y-2">
								{#each incident.updates as update}
									<div>
										<p class="text-sm text-gray-700">
											<span class="font-semibold">{getStatusLabel(update.status)}</span> - {update.message}
										</p>
										<p class="text-xs text-gray-500">{formatIncidentTime(update.created_at)}</p>
									</div>
								{/each}
							</div>
						</div>
					{/each}
				{/if}
			</div>
		{/each}
	</div>
</PublicLayout>
