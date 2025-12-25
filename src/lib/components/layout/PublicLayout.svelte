<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title?: string;
		children: Snippet;
	}

	let { title = 'System Status', children }: Props = $props();
</script>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<header class="border-b border-gray-200 bg-white">
		<div class="mx-auto max-w-4xl px-4 py-4 sm:px-6">
			<div class="flex items-center justify-between">
				<a href="/status" class="flex items-center gap-2">
					<svg class="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<span class="text-xl font-bold text-gray-900">{title}</span>
				</a>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="mx-auto max-w-4xl px-4 py-8 sm:px-6">
		{@render children()}
	</main>

	<!-- Footer -->
	<footer class="border-t border-gray-200 bg-white py-6">
		<div class="mx-auto max-w-4xl px-4 text-center text-sm text-gray-500 sm:px-6">
			Powered by <a href="https://pingflare.app" class="text-blue-600 hover:underline">Pingflare</a>
		</div>
	</footer>
</div>
