<script lang="ts">
	import type { Snippet } from 'svelte';
	import { IconButton } from '$lib/components/ui';

	let {
		title,
		subtitle = undefined,
		backHref = undefined,
		actions = undefined
	}: {
		title: string;
		subtitle?: string;
		backHref?: string;
		actions?: Snippet;
	} = $props();
</script>

<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
	<div class="flex items-center gap-3">
		{#if backHref}
			<a href={backHref} class="flex-shrink-0">
				<IconButton icon="back" label="Go back" />
			</a>
		{/if}
		<div>
			<h1 class="text-xl font-semibold text-gray-900 sm:text-2xl">{title}</h1>
			{#if subtitle}
				<p class="mt-1 text-sm text-gray-500">{subtitle}</p>
			{/if}
		</div>
	</div>

	{#if actions}
		<div class="flex items-center gap-2">
			{@render actions()}
		</div>
	{/if}
</div>
