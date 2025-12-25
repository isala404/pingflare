<script lang="ts">
	import type { Snippet } from 'svelte';

	type ContainerSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

	let {
		size = 'lg',
		class: className = '',
		children
	}: {
		size?: ContainerSize;
		class?: string;
		children?: Snippet;
	} = $props();

	const sizeStyles: Record<ContainerSize, string> = {
		sm: 'max-w-xl',
		md: 'max-w-3xl',
		lg: 'max-w-5xl',
		xl: 'max-w-7xl',
		full: 'max-w-full'
	};
</script>

<div class="mx-auto w-full px-4 sm:px-6 lg:px-8 {sizeStyles[size]} {className}">
	{#if children}
		{@render children()}
	{/if}
</div>
