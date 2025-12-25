<script lang="ts">
	type SpinnerSize = 'sm' | 'md' | 'lg';
	type SpinnerColor = 'primary' | 'white';

	let {
		size = 'md',
		color = 'primary',
		class: className = ''
	}: {
		size?: SpinnerSize;
		color?: SpinnerColor;
		class?: string;
	} = $props();

	const sizeStyles: Record<SpinnerSize, string> = {
		sm: 'h-4 w-4',
		md: 'h-6 w-6',
		lg: 'h-8 w-8'
	};

	const colorStyles: Record<SpinnerColor, { track: string; spinner: string }> = {
		primary: { track: 'text-gray-200', spinner: 'text-blue-600' },
		white: { track: 'text-white/30', spinner: 'text-white' }
	};

	const colors = $derived(colorStyles[color]);
</script>

<svg
	class="animate-spin {sizeStyles[size]} {className}"
	viewBox="0 0 24 24"
	fill="none"
	aria-hidden="true"
>
	<circle class={colors.track} cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
	></circle>
	<path
		class={colors.spinner}
		fill="currentColor"
		d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
	></path>
</svg>
