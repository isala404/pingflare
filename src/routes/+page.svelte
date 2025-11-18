<script lang="ts">
	let count = $state(0);
	let doubled = $derived(count * 2);
	let status = $state<'idle' | 'active' | 'paused'>('idle');

	function increment() {
		count++;
		if (status === 'idle') status = 'active';
	}

	function decrement() {
		count--;
	}

	function reset() {
		count = 0;
		status = 'idle';
	}

	$effect(() => {
		console.log('Count changed:', count);
	});
</script>

<div
	class="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100"
>
	<div class="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-xl">
		<div class="text-center">
			<h1 class="text-4xl font-bold text-gray-900">
				Welcome to <span class="text-blue-600">Pingflare</span>
			</h1>
			<p class="mt-2 text-gray-600">Uptime monitoring system built with SvelteKit 5</p>
		</div>

		<div class="space-y-6">
			<div class="rounded-lg bg-blue-50 p-6 text-center">
				<p class="text-sm font-medium text-gray-600">Counter Demo (Svelte 5 Runes)</p>
				<p class="mt-2 text-5xl font-bold text-blue-600">{count}</p>
				<p class="mt-1 text-sm text-gray-500">Doubled: {doubled}</p>
				<div
					class="mt-2 inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800"
				>
					Status: {status}
				</div>
			</div>

			<div class="flex flex-wrap gap-3">
				<button
					onclick={increment}
					class="flex-1 rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
				>
					Increment
				</button>
				<button
					onclick={decrement}
					class="flex-1 rounded-lg bg-gray-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none"
				>
					Decrement
				</button>
				<button
					onclick={reset}
					class="w-full rounded-lg bg-red-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none"
				>
					Reset
				</button>
			</div>

			<div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
				<h3 class="mb-2 font-semibold text-gray-900">Features Enabled:</h3>
				<ul class="space-y-2 text-sm text-gray-700">
					<li class="flex items-center">
						<svg class="mr-2 h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
								clip-rule="evenodd"
							/>
						</svg>
						Svelte 5 with Runes
					</li>
					<li class="flex items-center">
						<svg class="mr-2 h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
								clip-rule="evenodd"
							/>
						</svg>
						Tailwind CSS v4
					</li>
					<li class="flex items-center">
						<svg class="mr-2 h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
								clip-rule="evenodd"
							/>
						</svg>
						TypeScript
					</li>
					<li class="flex items-center">
						<svg class="mr-2 h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
								clip-rule="evenodd"
							/>
						</svg>
						PWA with Push Notifications
					</li>
					<li class="flex items-center">
						<svg class="mr-2 h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
								clip-rule="evenodd"
							/>
						</svg>
						ESLint & Prettier
					</li>
				</ul>
			</div>

			<div class="text-center text-sm text-gray-500">
				<p>
					Check out <a
						href="https://github.com/isala404/pingflare"
						class="font-medium text-blue-600 hover:text-blue-700">Agents.md</a
					> for development guidelines
				</p>
			</div>
		</div>
	</div>
</div>
