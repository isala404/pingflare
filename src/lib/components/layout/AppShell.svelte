<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { UserPublic } from '$lib/types/auth';
	import Header from './Header.svelte';
	import BottomNav from './BottomNav.svelte';

	let {
		user = undefined,
		children
	}: {
		user?: UserPublic | null;
		children?: Snippet;
	} = $props();
</script>

<div class="min-h-screen bg-gray-50">
	<Header {user} />

	<main class="pb-20 pt-4 md:pb-8 md:pt-6">
		{#if children}
			{@render children()}
		{/if}
	</main>

	<BottomNav />
</div>
