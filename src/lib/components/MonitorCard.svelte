<script lang="ts">
	import { resolve } from '$app/paths';
	import type { MonitorWithStatus } from '$lib/types/monitor';
	import { jsonToScript } from '$lib/types/script';
	import StatusBadge from './StatusBadge.svelte';

	let {
		monitor,
		onDelete
	}: {
		monitor: MonitorWithStatus;
		onDelete: (id: string) => void;
	} = $props();

	function formatTime(isoString: string | null | undefined): string {
		if (!isoString) return 'Never';
		const date = new Date(isoString);
		return date.toLocaleString();
	}

	function formatResponseTime(ms: number | null | undefined): string {
		if (ms === null || ms === undefined) return '-';
		if (ms < 1000) return `${ms}ms`;
		return `${(ms / 1000).toFixed(2)}s`;
	}

	function getScriptInfo(script: string | null): { stepCount: number; firstUrl: string } {
		if (!script) return { stepCount: 0, firstUrl: '' };
		const parsed = jsonToScript(script);
		if (!parsed) return { stepCount: 0, firstUrl: '' };
		const firstUrl = parsed.steps[0]?.request?.url ?? '';
		return { stepCount: parsed.steps.length, firstUrl };
	}

	let scriptInfo = $derived(getScriptInfo(monitor.script));
</script>

<div
	class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
>
	<div class="flex items-start justify-between">
		<div class="flex-1">
			<div class="flex items-center gap-2">
				<h3 class="text-lg font-semibold text-gray-900">{monitor.name}</h3>
				<StatusBadge status={monitor.current_status} />
			</div>
			<p class="mt-1 text-sm text-gray-500">
				{scriptInfo.stepCount} step{scriptInfo.stepCount !== 1 ? 's' : ''}
				{#if scriptInfo.firstUrl}
					<span class="mx-1">&middot;</span>
					<span class="max-w-xs truncate inline-block align-bottom">{scriptInfo.firstUrl}</span>
				{/if}
			</p>
		</div>
		<div class="flex gap-2">
			<a
				href={resolve(`/monitors/${monitor.id}/edit`)}
				class="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
				title="Edit monitor"
			>
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
					/>
				</svg>
			</a>
			<button
				onclick={() => onDelete(monitor.id)}
				class="rounded-md p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
				title="Delete monitor"
			>
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
					/>
				</svg>
			</button>
		</div>
	</div>

	<div class="mt-4 grid grid-cols-3 gap-4 text-sm">
		<div>
			<p class="text-gray-500">Response Time</p>
			<p class="font-medium text-gray-900">
				{formatResponseTime(monitor.last_check?.response_time_ms)}
			</p>
		</div>
		<div>
			<p class="text-gray-500">Uptime (24h)</p>
			<p class="font-medium text-gray-900">{monitor.uptime_24h?.toFixed(2) ?? '-'}%</p>
		</div>
		<div>
			<p class="text-gray-500">Last Check</p>
			<p class="font-medium text-gray-900">{formatTime(monitor.last_check?.checked_at)}</p>
		</div>
	</div>

	{#if monitor.last_check?.error_message}
		<div class="mt-3 rounded-md bg-red-50 p-2">
			<p class="text-sm text-red-700">{monitor.last_check.error_message}</p>
		</div>
	{/if}
</div>
