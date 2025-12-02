<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		open,
		title,
		onClose,
		children
	}: {
		open: boolean;
		title: string;
		onClose: () => void;
		children: Snippet;
	} = $props();

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		onclick={handleBackdropClick}
		role="dialog"
		tabindex="-1"
		aria-modal="true"
		aria-labelledby="modal-title"
	>
		<div class="w-full max-w-lg rounded-lg bg-white shadow-xl">
			<div class="flex items-center justify-between border-b border-gray-200 px-6 py-4">
				<h2 id="modal-title" class="text-lg font-semibold text-gray-900">{title}</h2>
				<button
					onclick={onClose}
					aria-label="Close modal"
					class="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
				>
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>
			<div class="px-6 py-4">
				{@render children()}
			</div>
		</div>
	</div>
{/if}
