<script lang="ts">
	import type { Snippet } from 'svelte';

	type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
	type ButtonSize = 'sm' | 'md' | 'lg';

	let {
		variant = 'primary',
		size = 'md',
		type = 'button',
		disabled = false,
		loading = false,
		href = undefined,
		class: className = '',
		children,
		onclick
	}: {
		variant?: ButtonVariant;
		size?: ButtonSize;
		type?: 'button' | 'submit';
		disabled?: boolean;
		loading?: boolean;
		href?: string;
		class?: string;
		children?: Snippet;
		onclick?: (e: MouseEvent) => void;
	} = $props();

	const baseStyles =
		'inline-flex items-center justify-center font-medium rounded-lg transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

	const variantStyles: Record<ButtonVariant, string> = {
		primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
		secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500',
		danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
		ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500'
	};

	const sizeStyles: Record<ButtonSize, string> = {
		sm: 'px-3 py-1.5 text-sm gap-1.5',
		md: 'px-4 py-2 text-sm gap-2',
		lg: 'px-5 py-2.5 text-base gap-2'
	};

	let computedClass = $derived(
		`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`
	);
</script>

{#if href && !disabled}
	<a {href} class={computedClass}>
		{#if loading}
			<svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
				></circle>
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				></path>
			</svg>
		{/if}
		{#if children}
			{@render children()}
		{/if}
	</a>
{:else}
	<button {type} class={computedClass} disabled={disabled || loading} {onclick}>
		{#if loading}
			<svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
				></circle>
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				></path>
			</svg>
		{/if}
		{#if children}
			{@render children()}
		{/if}
	</button>
{/if}
