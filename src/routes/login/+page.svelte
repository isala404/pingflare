<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let isSubmitting = $state(false);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';

		if (!email || !password) {
			error = 'Email and password are required';
			return;
		}

		isSubmitting = true;

		try {
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password })
			});

			const data = (await response.json()) as { error?: string; success?: boolean };

			if (!response.ok) {
				error = data.error || 'Login failed';
				return;
			}

			// Redirect to dashboard
			await goto(resolve('/'));
		} catch {
			error = 'An error occurred. Please try again.';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>Login - Pingflare</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
	<div class="w-full max-w-md space-y-8">
		<div class="text-center">
			<h1 class="text-3xl font-bold text-gray-900">Pingflare</h1>
			<p class="mt-2 text-gray-600">Sign in to your account</p>
		</div>

		<div class="rounded-lg bg-white p-8 shadow-md">
			{#if error}
				<div class="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
			{/if}

			<form onsubmit={handleSubmit} class="space-y-6">
				<div>
					<label for="email" class="block text-sm font-medium text-gray-700">Email</label>
					<input
						type="email"
						id="email"
						bind:value={email}
						autocomplete="email"
						class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
					/>
				</div>

				<div>
					<label for="password" class="block text-sm font-medium text-gray-700">Password</label>
					<input
						type="password"
						id="password"
						bind:value={password}
						autocomplete="current-password"
						class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
					/>
				</div>

				<button
					type="submit"
					disabled={isSubmitting}
					class="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
				>
					{isSubmitting ? 'Signing in...' : 'Sign in'}
				</button>
			</form>
		</div>
	</div>
</div>
