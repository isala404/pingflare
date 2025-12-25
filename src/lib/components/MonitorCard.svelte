<script lang="ts">
	import type { MonitorWithStatus } from '$lib/types/monitor';
	import type { ScriptDSL } from '$lib/types/script';
	import { Card, Badge, IconButton } from '$lib/components/ui';
	import { formatTime, formatResponseTime, formatUptime } from '$lib/utils/format';

	let {
		monitor,
		onDelete
	}: {
		monitor: MonitorWithStatus;
		onDelete?: (id: string) => void;
	} = $props();

	// Tick state to force re-render of relative time every second
	let tick = $state(0);

	$effect(() => {
		const interval = setInterval(() => {
			tick++;
		}, 1000); // Update every second for accurate countdown
		return () => clearInterval(interval);
	});

	// Reactive relative time that updates with tick
	const lastCheckTime = $derived.by(() => {
		// Reference tick to trigger re-computation
		void tick;
		return formatTime(monitor.last_check?.checked_at ?? null);
	});

	// Parse script to get step info
	const scriptData = $derived.by(() => {
		try {
			const parsed = JSON.parse(monitor.script) as ScriptDSL;
			return {
				stepCount: parsed.steps?.length ?? 0,
				firstUrl: parsed.steps?.[0]?.request?.url ?? ''
			};
		} catch {
			return { stepCount: 0, firstUrl: '' };
		}
	});

	function getDisplayUrl(url: string): string {
		if (!url) return 'No URL';
		try {
			const parsed = new URL(url);
			return parsed.host + (parsed.pathname !== '/' ? parsed.pathname : '');
		} catch {
			return url.length > 40 ? url.slice(0, 40) + '...' : url;
		}
	}
</script>

<Card class="transition-shadow hover:shadow-md">
	<div class="flex items-start justify-between gap-3">
		<div class="min-w-0 flex-1">
			<div class="flex items-center gap-2">
				<h3 class="truncate text-lg font-semibold text-gray-900">
					{monitor.name}
				</h3>
				<Badge status={monitor.current_status} />
			</div>

			<p class="mt-1 truncate text-sm text-gray-500">
				{getDisplayUrl(scriptData.firstUrl)}
				{#if scriptData.stepCount > 1}
					<span class="text-gray-400">+{scriptData.stepCount - 1} steps</span>
				{/if}
			</p>
		</div>

		<div class="flex shrink-0 items-center gap-1">
			<IconButton icon="edit" href={`/monitors/${monitor.id}/edit`} label="Edit monitor" />
			{#if onDelete}
				<IconButton icon="delete" onclick={() => onDelete(monitor.id)} label="Delete monitor" />
			{/if}
		</div>
	</div>

	<div class="mt-4 grid grid-cols-3 gap-2 border-t border-gray-100 pt-3 text-center">
		<div>
			<p class="text-xs text-gray-500">Uptime</p>
			<p class="text-sm font-medium text-gray-900">
				{formatUptime(monitor.uptime_24h)}
			</p>
		</div>
		<div>
			<p class="text-xs text-gray-500">Last Check</p>
			<p class="text-sm font-medium text-gray-900">
				{lastCheckTime}
			</p>
		</div>
		<div>
			<p class="text-xs text-gray-500">Response</p>
			<p class="text-sm font-medium text-gray-900">
				{formatResponseTime(monitor.last_check?.response_time_ms ?? null)}
			</p>
		</div>
	</div>
</Card>
