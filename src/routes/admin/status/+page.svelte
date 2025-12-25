<script lang="ts">
	import type { PageData } from './$types';
	import type { GroupWithStatus } from '$lib/types/group';
	import type { OverallStatus, StatusMonitor } from '$lib/types/status';
	import { AppShell, Container, PageHeader } from '$lib/components/layout';
	import { Button } from '$lib/components/ui';
	import { getOverallStatus, getOverallStatusText, getOverallStatusColor } from '$lib/types/status';
	import UptimeBars from '$lib/components/UptimeBars.svelte';

	let { data }: { data: PageData } = $props();

	// Compute overall status across all groups
	function getGlobalStatus(groups: GroupWithStatus[]): OverallStatus {
		const allMonitors: StatusMonitor[] = groups.flatMap((g) => g.monitors);
		return getOverallStatus(allMonitors);
	}

	function getTotalMonitorCount(groups: GroupWithStatus[]): number {
		return groups.reduce((sum, g) => sum + g.monitors.length, 0);
	}

	function getOperationalCount(groups: GroupWithStatus[]): number {
		return groups.reduce(
			(sum, g) => sum + g.monitors.filter((m) => m.current_status === 'up').length,
			0
		);
	}

	const globalStatus = $derived(getGlobalStatus(data.groups));
	const statusText = $derived(getOverallStatusText(globalStatus));
	const statusColor = $derived(getOverallStatusColor(globalStatus));
	const totalMonitors = $derived(getTotalMonitorCount(data.groups));
	const operationalCount = $derived(getOperationalCount(data.groups));

	function getGroupStatusBadge(status: OverallStatus): { text: string; class: string } {
		switch (status) {
			case 'operational':
				return { text: 'Operational', class: 'bg-green-100 text-green-800' };
			case 'degraded':
				return { text: 'Degraded', class: 'bg-yellow-100 text-yellow-800' };
			case 'partial_outage':
				return { text: 'Partial Outage', class: 'bg-orange-100 text-orange-800' };
			case 'major_outage':
				return { text: 'Major Outage', class: 'bg-red-100 text-red-800' };
		}
	}
</script>

<svelte:head>
	<title>Status Overview - Pingflare</title>
</svelte:head>

<AppShell user={data.user}>
	<Container>
		<PageHeader title="Status Overview" backHref="/">
			{#snippet actions()}
				<div class="flex gap-2">
					<Button variant="secondary" href="/admin/groups">Manage Groups</Button>
					<a
						href="/status"
						target="_blank"
						class="inline-flex items-center justify-center font-medium rounded-lg transition-colors px-4 py-2 text-sm bg-gray-100 text-gray-900 hover:bg-gray-200"
					>
						View Public Page
					</a>
					<Button href="/admin/incidents">Manage Incidents</Button>
				</div>
			{/snippet}
		</PageHeader>

		<!-- Overall Status Banner -->
		<div class="mb-8 rounded-lg p-6 text-white {statusColor}">
			<div class="flex items-center gap-3">
				<span class="relative flex h-4 w-4">
					<span
						class="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-50"
					></span>
					<span class="relative inline-flex h-4 w-4 rounded-full bg-white"></span>
				</span>
				<h2 class="text-xl font-semibold">{statusText}</h2>
			</div>
			<p class="mt-2 text-sm opacity-90">
				{totalMonitors} monitors total • {operationalCount} operational • {data.groups.length} groups
			</p>
		</div>

		<!-- Active Incidents -->
		{#if data.activeIncidents.length > 0}
			<div class="mb-8">
				<h3 class="mb-4 text-lg font-semibold text-gray-900">Active Incidents</h3>
				{#each data.activeIncidents as incident}
					<div class="mb-4 rounded-lg border-l-4 border-orange-400 bg-orange-50 p-4">
						<div class="flex items-start justify-between">
							<div>
								<div class="flex items-center gap-2">
									<h4 class="font-semibold text-orange-700">{incident.title}</h4>
									{#if incident.group_name}
										<span class="rounded bg-orange-100 px-2 py-0.5 text-xs text-orange-600"
											>{incident.group_name}</span
										>
									{/if}
								</div>
								{#if incident.updates.length > 0}
									<p class="mt-1 text-sm text-gray-600">
										<span class="font-medium capitalize">{incident.updates[0].status}</span> - {incident
											.updates[0].message}
									</p>
								{/if}
							</div>
							<a href="/admin/incidents" class="text-sm text-orange-600 hover:underline">Manage</a>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Groups with Monitors -->
		<div class="mb-8">
			<div class="flex items-center justify-between mb-4">
				<h3 class="text-lg font-semibold text-gray-900">All Groups</h3>
				<p class="text-sm text-gray-500">Uptime over the past 90 days</p>
			</div>

			{#if data.groups.length > 0}
				<div class="space-y-6">
					{#each data.groups as group}
						{@const statusBadge = getGroupStatusBadge(group.overall_status)}
						<div class="rounded-lg border border-gray-200 bg-white shadow-sm">
							<!-- Group Header -->
							<div class="flex items-center justify-between border-b border-gray-100 px-4 py-3">
								<div class="flex items-center gap-3">
									<h4 class="font-semibold text-gray-900">{group.name}</h4>
									<span class="rounded-full px-2 py-0.5 text-xs font-medium {statusBadge.class}">
										{statusBadge.text}
									</span>
									<span class="text-sm text-gray-400">
										{group.monitors.length} monitor{group.monitors.length === 1 ? '' : 's'}
									</span>
								</div>
								<span class="text-sm text-gray-500">{group.uptime_90d.toFixed(2)}% uptime</span>
							</div>

							<!-- Monitors in this group -->
							{#if group.monitors.length > 0}
								<div class="divide-y divide-gray-50 p-4">
									{#each group.monitors as monitor}
										<div class="py-2 first:pt-0 last:pb-0">
											<UptimeBars
												name={monitor.name}
												days={monitor.daily_status}
												uptimePercent={monitor.uptime_90d}
												currentStatus={monitor.current_status}
											/>
										</div>
									{/each}
								</div>
							{:else}
								<div class="p-4 text-center text-sm text-gray-500">No monitors in this group.</div>
							{/if}
						</div>
					{/each}
				</div>
			{:else}
				<div class="rounded-lg border border-gray-200 bg-white p-8 text-center">
					<p class="text-gray-500">No groups configured.</p>
					<div class="mt-4 flex justify-center gap-2">
						<Button href="/admin/groups">Create Group</Button>
						<Button variant="secondary" href="/monitors/new">Add Monitor</Button>
					</div>
				</div>
			{/if}
		</div>
	</Container>
</AppShell>
