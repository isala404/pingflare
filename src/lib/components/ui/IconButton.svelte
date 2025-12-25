<script lang="ts">
	type IconType =
		| 'edit'
		| 'delete'
		| 'add'
		| 'chevron-up'
		| 'chevron-down'
		| 'close'
		| 'back'
		| 'menu'
		| 'check'
		| 'refresh';
	type IconButtonVariant = 'default' | 'danger';
	type IconButtonSize = 'sm' | 'md';

	let {
		icon,
		variant = 'default',
		size = 'md',
		label,
		href,
		disabled = false,
		class: className = '',
		onclick
	}: {
		icon: IconType;
		variant?: IconButtonVariant;
		size?: IconButtonSize;
		label: string;
		href?: string;
		disabled?: boolean;
		class?: string;
		onclick?: (e: MouseEvent) => void;
	} = $props();

	const variantStyles: Record<IconButtonVariant, string> = {
		default: 'text-gray-500 hover:text-gray-700 hover:bg-gray-100',
		danger: 'text-gray-500 hover:text-red-600 hover:bg-red-50'
	};

	const sizeStyles: Record<IconButtonSize, { button: string; icon: string }> = {
		sm: { button: 'p-1', icon: 'h-4 w-4' },
		md: { button: 'p-1.5', icon: 'h-5 w-5' }
	};

	const iconPaths: Record<IconType, string> = {
		edit: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
		delete:
			'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
		add: 'M12 4v16m8-8H4',
		'chevron-up': 'M5 15l7-7 7 7',
		'chevron-down': 'M19 9l-7 7-7-7',
		close: 'M6 18L18 6M6 6l12 12',
		back: 'M10 19l-7-7m0 0l7-7m-7 7h18',
		menu: 'M4 6h16M4 12h16M4 18h16',
		check: 'M5 13l4 4L19 7',
		refresh:
			'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
	};

	const sizes = $derived(sizeStyles[size]);
</script>

{#snippet iconContent()}
	<svg class={sizes.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
		<path stroke-linecap="round" stroke-linejoin="round" d={iconPaths[icon]}></path>
	</svg>
{/snippet}

{#if href && !disabled}
	<a
		{href}
		class="inline-flex rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 {variantStyles[
			variant
		]} {sizes.button} {className}"
		aria-label={label}
		title={label}
	>
		{@render iconContent()}
	</a>
{:else}
	<button
		type="button"
		class="rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed {variantStyles[
			variant
		]} {sizes.button} {className}"
		{disabled}
		{onclick}
		aria-label={label}
		title={label}
	>
		{@render iconContent()}
	</button>
{/if}
