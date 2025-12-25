<script lang="ts">
	import type { PageData } from './$types';
	import type { GroupWithStatus } from '$lib/types/group';
	import type { OverallStatus, StatusMonitor } from '$lib/types/status';
	import { getOverallStatus, getOverallStatusText, getOverallStatusColor } from '$lib/types/status';
	import PublicLayout from '$lib/components/layout/PublicLayout.svelte';

	let { data }: { data: PageData } = $props();

	// Compute overall status across all groups
	function getGlobalStatus(groups: GroupWithStatus[]): OverallStatus {
		const allMonitors: StatusMonitor[] = groups.flatMap((g) => g.monitors);
		return getOverallStatus(allMonitors);
	}

	const globalStatus = $derived(getGlobalStatus(data.groups));
	const statusText = $derived(getOverallStatusText(globalStatus));
	const statusColor = $derived(getOverallStatusColor(globalStatus));

	function getStatusBadge(status: OverallStatus): {
		text: string;
		bgClass: string;
		dotClass: string;
	} {
		switch (status) {
			case 'operational':
				return { text: 'Operational', bgClass: 'bg-green-50', dotClass: 'bg-green-500' };
			case 'degraded':
				return { text: 'Degraded', bgClass: 'bg-yellow-50', dotClass: 'bg-yellow-500' };
			case 'partial_outage':
				return { text: 'Partial Outage', bgClass: 'bg-orange-50', dotClass: 'bg-orange-500' };
			case 'major_outage':
				return { text: 'Major Outage', bgClass: 'bg-red-50', dotClass: 'bg-red-500' };
		}
	}

	function formatIncidentTime(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getStatusLabel(status: string): string {
		return status.charAt(0).toUpperCase() + status.slice(1);
	}
</script>

<svelte:head>
	<title>System Status</title>
</svelte:head>

<PublicLayout>
	<!-- Overall Status Banner -->
	<div class="mb-8 rounded-lg p-6 text-white {statusColor}">
		<h2 class="text-xl font-semibold">{statusText}</h2>
	</div>

	<!-- Active Incidents -->
	{#if data.activeIncidents.length > 0}
		<div class="mb-8">
			{#each data.activeIncidents as incident}
				<div class="mb-4 rounded-lg border-l-4 border-orange-400 bg-orange-50 p-4">
					<div class="flex items-center gap-2">
						<h3 class="font-semibold text-orange-700">{incident.title}</h3>
						{#if incident.group_name}
							<span class="rounded bg-orange-100 px-2 py-0.5 text-xs text-orange-600"
								>{incident.group_name}</span
							>
						{/if}
					</div>
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

	<!-- Group Cards -->
	{#if data.groups.length > 0}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.groups as group}
				{@const badge = getStatusBadge(group.overall_status)}
				<a
					href="/status/{group.slug}"
					class="block rounded-lg border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md"
				>
					<div class="flex items-start justify-between">
						<div>
							<h3 class="font-semibold text-gray-900">{group.name}</h3>
							{#if group.description}
								<p class="mt-1 text-sm text-gray-500">{group.description}</p>
							{/if}
						</div>
						<div class="flex items-center gap-2 rounded-full px-2.5 py-1 {badge.bgClass}">
							<span class="h-2 w-2 rounded-full {badge.dotClass}"></span>
							<span class="text-xs font-medium text-gray-700">{badge.text}</span>
						</div>
					</div>
					<div class="mt-4 flex items-center justify-between text-sm">
						<span class="text-gray-500"
							>{group.monitors.length} monitor{group.monitors.length === 1 ? '' : 's'}</span
						>
						<span class="font-medium text-gray-700">{group.uptime_90d.toFixed(2)}% uptime</span>
					</div>
				</a>
			{/each}
		</div>
	{:else}
		<div class="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
			No public status pages configured.
		</div>
	{/if}
</PublicLayout>
