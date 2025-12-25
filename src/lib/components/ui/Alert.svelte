<script lang="ts">
	import type { Snippet } from 'svelte';

	type AlertVariant = 'error' | 'success' | 'warning' | 'info';

	let {
		variant = 'info',
		title = undefined,
		dismissible = false,
		children,
		ondismiss
	}: {
		variant?: AlertVariant;
		title?: string;
		dismissible?: boolean;
		children?: Snippet;
		ondismiss?: () => void;
	} = $props();

	let visible = $state(true);

	const variantStyles: Record<
		AlertVariant,
		{ bg: string; border: string; text: string; icon: string }
	> = {
		error: {
			bg: 'bg-red-50',
			border: 'border-red-200',
			text: 'text-red-800',
			icon: 'text-red-400'
		},
		success: {
			bg: 'bg-green-50',
			border: 'border-green-200',
			text: 'text-green-800',
			icon: 'text-green-400'
		},
		warning: {
			bg: 'bg-yellow-50',
			border: 'border-yellow-200',
			text: 'text-yellow-800',
			icon: 'text-yellow-400'
		},
		info: {
			bg: 'bg-blue-50',
			border: 'border-blue-200',
			text: 'text-blue-800',
			icon: 'text-blue-400'
		}
	};

	const icons: Record<AlertVariant, string> = {
		error: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
		success: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
		warning:
			'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
		info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
	};

	const styles = $derived(variantStyles[variant]);

	function handleDismiss() {
		visible = false;
		ondismiss?.();
	}
</script>

{#if visible}
	<div class="rounded-lg border p-4 {styles.bg} {styles.border}" role="alert">
		<div class="flex">
			<div class="flex-shrink-0">
				<svg class="h-5 w-5 {styles.icon}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={icons[variant]}
					></path>
				</svg>
			</div>
			<div class="ml-3 flex-1">
				{#if title}
					<h3 class="text-sm font-medium {styles.text}">{title}</h3>
				{/if}
				{#if children}
					<div class="text-sm {styles.text}" class:mt-1={!!title}>
						{@render children()}
					</div>
				{/if}
			</div>
			{#if dismissible}
				<button
					type="button"
					class="ml-3 inline-flex rounded-md p-1.5 {styles.text} hover:bg-white/50 focus:outline-none focus:ring-2 focus:ring-offset-2"
					onclick={handleDismiss}
					aria-label="Dismiss"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						></path>
					</svg>
				</button>
			{/if}
		</div>
	</div>
{/if}
