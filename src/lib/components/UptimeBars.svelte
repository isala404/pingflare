<script lang="ts">
	import type { DailyStatus } from '$lib/types/status';

	interface Props {
		name: string;
		days: DailyStatus[];
		uptimePercent: number;
		currentStatus: 'up' | 'down' | 'degraded' | null;
	}

	let { name, days, uptimePercent, currentStatus }: Props = $props();

	function getStatusColor(status: 'up' | 'down' | 'degraded' | 'none'): string {
		switch (status) {
			case 'up':
				return 'bg-green-500';
			case 'down':
				return 'bg-red-500';
			case 'degraded':
				return 'bg-yellow-500';
			default:
				return 'bg-gray-200';
		}
	}

	function getStatusText(status: 'up' | 'down' | 'degraded' | null): string {
		switch (status) {
			case 'up':
				return 'Operational';
			case 'down':
				return 'Outage';
			case 'degraded':
				return 'Degraded';
			default:
				return 'Unknown';
		}
	}

	function getStatusTextColor(status: 'up' | 'down' | 'degraded' | null): string {
		switch (status) {
			case 'up':
				return 'text-green-600';
			case 'down':
				return 'text-red-600';
			case 'degraded':
				return 'text-yellow-600';
			default:
				return 'text-gray-500';
		}
	}

	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	let hoveredDay = $state<DailyStatus | null>(null);
	let tooltipX = $state(0);
	let tooltipY = $state(0);

	function handleMouseEnter(day: DailyStatus, event: MouseEvent) {
		hoveredDay = day;
		const rect = (event.target as HTMLElement).getBoundingClientRect();
		tooltipX = rect.left + rect.width / 2;
		tooltipY = rect.top;
	}

	function handleMouseLeave() {
		hoveredDay = null;
	}
</script>

<div class="rounded-lg border border-gray-200 bg-white p-4">
	<div class="mb-3 flex items-center justify-between">
		<span class="font-medium text-gray-900">{name}</span>
		<span class="text-sm font-medium {getStatusTextColor(currentStatus)}">
			{getStatusText(currentStatus)}
		</span>
	</div>

	<div class="mb-2 flex gap-[2px]">
		{#each days as day}
			<button
				type="button"
				class="h-8 flex-1 rounded-sm transition-opacity hover:opacity-80 {getStatusColor(
					day.status
				)}"
				onmouseenter={(e) => handleMouseEnter(day, e)}
				onmouseleave={handleMouseLeave}
				aria-label="{formatDate(day.date)}: {day.status}"
			></button>
		{/each}
	</div>

	<div class="flex items-center justify-between text-xs text-gray-500">
		<span>90 days ago</span>
		<span>{uptimePercent.toFixed(2)}% uptime</span>
		<span>Today</span>
	</div>
</div>

{#if hoveredDay}
	<div
		class="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-lg border border-gray-200 bg-white p-3 shadow-lg"
		style="left: {tooltipX}px; top: {tooltipY - 8}px;"
	>
		<div class="mb-2 font-medium text-gray-900">{formatDate(hoveredDay.date)}</div>
		{#if hoveredDay.status === 'none'}
			<div class="text-sm text-gray-500">No data</div>
		{:else}
			<div class="flex items-center gap-2 text-sm">
				<span
					class="h-2 w-2 rounded-full {hoveredDay.status === 'up'
						? 'bg-green-500'
						: hoveredDay.status === 'down'
							? 'bg-red-500'
							: 'bg-yellow-500'}"
				></span>
				<span class="capitalize">{hoveredDay.status}</span>
				{#if hoveredDay.downtime_minutes > 0}
					<span class="text-gray-500">
						{Math.floor(hoveredDay.downtime_minutes / 60)}h {hoveredDay.downtime_minutes % 60}m
						downtime
					</span>
				{/if}
			</div>
		{/if}
	</div>
{/if}
