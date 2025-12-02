<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let error = $state('');
	let isSubmitting = $state(false);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';

		if (!name || !email || !password || !confirmPassword) {
			error = 'All fields are required';
			return;
		}

		if (name.length < 2) {
			error = 'Name must be at least 2 characters';
			return;
		}

		if (!email.includes('@')) {
			error = 'Please enter a valid email address';
			return;
		}

		if (password.length < 8) {
			error = 'Password must be at least 8 characters';
			return;
		}

		if (password !== confirmPassword) {
			error = 'Passwords do not match';
			return;
		}

		isSubmitting = true;

		try {
			const response = await fetch('/api/auth/setup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, email, password })
			});

			const data = (await response.json()) as { error?: string; success?: boolean };

			if (!response.ok) {
				error = data.error || 'Setup failed';
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
	<title>Setup - Pingflare</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
	<div class="w-full max-w-md space-y-8">
		<div class="text-center">
			<h1 class="text-3xl font-bold text-gray-900">Welcome to Pingflare</h1>
			<p class="mt-2 text-gray-600">Create your admin account to get started</p>
		</div>

		<div class="rounded-lg bg-white p-8 shadow-md">
			{#if error}
				<div class="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
			{/if}

			<form onsubmit={handleSubmit} class="space-y-6">
				<div>
					<label for="name" class="block text-sm font-medium text-gray-700">Name</label>
					<input
						type="text"
						id="name"
						bind:value={name}
						autocomplete="name"
						class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
						placeholder="Your name"
					/>
				</div>

				<div>
					<label for="email" class="block text-sm font-medium text-gray-700">Email</label>
					<input
						type="email"
						id="email"
						bind:value={email}
						autocomplete="email"
						class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
						placeholder="admin@example.com"
					/>
				</div>

				<div>
					<label for="password" class="block text-sm font-medium text-gray-700">Password</label>
					<input
						type="password"
						id="password"
						bind:value={password}
						autocomplete="new-password"
						class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
						placeholder="Minimum 8 characters"
					/>
				</div>

				<div>
					<label for="confirmPassword" class="block text-sm font-medium text-gray-700"
						>Confirm Password</label
					>
					<input
						type="password"
						id="confirmPassword"
						bind:value={confirmPassword}
						autocomplete="new-password"
						class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
						placeholder="Confirm your password"
					/>
				</div>

				<button
					type="submit"
					disabled={isSubmitting}
					class="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
				>
					{isSubmitting ? 'Creating Account...' : 'Create Admin Account'}
				</button>
			</form>
		</div>

		<p class="text-center text-sm text-gray-500">
			This will be the only admin account. You can add more users later.
		</p>
	</div>
</div>
