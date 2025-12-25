<script lang="ts">
	import type { Snippet } from 'svelte';

	type CardPadding = 'none' | 'sm' | 'md' | 'lg';

	let {
		padding = 'md',
		class: className = '',
		header = undefined,
		footer = undefined,
		children
	}: {
		padding?: CardPadding;
		class?: string;
		header?: Snippet;
		footer?: Snippet;
		children?: Snippet;
	} = $props();

	const paddingStyles: Record<CardPadding, string> = {
		none: '',
		sm: 'p-3',
		md: 'p-4',
		lg: 'p-6'
	};

	const baseStyles = 'bg-white rounded-lg border border-gray-200 shadow-sm';
</script>

<div class="{baseStyles} {className}">
	{#if header}
		<div class="border-b border-gray-200 px-4 py-3">
			{@render header()}
		</div>
	{/if}

	<div class={paddingStyles[padding]}>
		{#if children}
			{@render children()}
		{/if}
	</div>

	{#if footer}
		<div class="border-t border-gray-200 px-4 py-3 bg-gray-50 rounded-b-lg">
			{@render footer()}
		</div>
	{/if}
</div>
