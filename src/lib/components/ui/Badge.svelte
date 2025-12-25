<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { MonitorStatus } from '$lib/types/monitor';

	type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'neutral';
	type BadgeSize = 'sm' | 'md' | 'lg';

	let {
		variant = 'neutral',
		size = 'sm',
		status = undefined,
		class: className = '',
		children
	}: {
		variant?: BadgeVariant;
		size?: BadgeSize;
		status?: MonitorStatus | null;
		class?: string;
		children?: Snippet;
	} = $props();

	// Map monitor status to badge variant
	const statusToVariant: Record<MonitorStatus, BadgeVariant> = {
		up: 'success',
		down: 'error',
		degraded: 'warning'
	};

	const resolvedVariant = $derived(status ? statusToVariant[status] : variant);

	const variantStyles: Record<BadgeVariant, string> = {
		success: 'bg-green-100 text-green-800',
		error: 'bg-red-100 text-red-800',
		warning: 'bg-yellow-100 text-yellow-800',
		info: 'bg-blue-100 text-blue-800',
		neutral: 'bg-gray-100 text-gray-800'
	};

	const sizeStyles: Record<BadgeSize, string> = {
		sm: 'px-2 py-0.5 text-xs',
		md: 'px-2.5 py-1 text-sm',
		lg: 'px-3 py-1.5 text-base'
	};

	const computedStyles = $derived(
		`inline-flex items-center font-medium rounded-full ${variantStyles[resolvedVariant]} ${sizeStyles[size]} ${className}`
	);
</script>

<span class={computedStyles}>
	{#if status}
		{status.charAt(0).toUpperCase() + status.slice(1)}
	{:else if children}
		{@render children()}
	{:else}
		Unknown
	{/if}
</span>
