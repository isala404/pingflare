<script lang="ts">
	import type { MonitorStatus } from '$lib/types/monitor';

	let { status }: { status: MonitorStatus | null } = $props();

	const statusConfig = {
		up: { bg: 'bg-green-100', text: 'text-green-800', label: 'Up' },
		down: { bg: 'bg-red-100', text: 'text-red-800', label: 'Down' },
		degraded: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Degraded' }
	};

	let config = $derived(status ? statusConfig[status] : null);
</script>

{#if config}
	<span class="{config.bg} {config.text} rounded-full px-2.5 py-0.5 text-xs font-medium">
		{config.label}
	</span>
{:else}
	<span class="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
		Unknown
	</span>
{/if}
