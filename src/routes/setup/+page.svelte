<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Container } from '$lib/components/layout';
	import { Card, Input, Button, Alert } from '$lib/components/ui';

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

			const data = (await response.json()) as { error?: string };

			if (!response.ok) {
				error = data.error || 'Setup failed';
				return;
			}

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

<div class="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
	<Container size="sm">
		<div class="text-center">
			<div
				class="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white"
			>
				<svg class="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
					></path>
				</svg>
			</div>
			<h1 class="mt-4 text-2xl font-bold text-gray-900">Welcome to Pingflare</h1>
			<p class="mt-1 text-gray-600">Create your admin account to get started</p>
		</div>

		<Card class="mt-8" padding="lg">
			{#if error}
				<div class="mb-4">
					<Alert variant="error">{error}</Alert>
				</div>
			{/if}

			<form onsubmit={handleSubmit} class="space-y-4">
				<Input
					type="text"
					name="name"
					label="Name"
					placeholder="Your name"
					bind:value={name}
					required
				/>

				<Input
					type="email"
					name="email"
					label="Email"
					placeholder="admin@example.com"
					bind:value={email}
					required
				/>

				<Input
					type="password"
					name="password"
					label="Password"
					placeholder="Minimum 8 characters"
					helper="At least 8 characters"
					bind:value={password}
					required
				/>

				<Input
					type="password"
					name="confirmPassword"
					label="Confirm Password"
					placeholder="Confirm your password"
					bind:value={confirmPassword}
					required
				/>

				<Button type="submit" loading={isSubmitting} class="w-full">
					{isSubmitting ? 'Creating Account...' : 'Create Admin Account'}
				</Button>
			</form>
		</Card>

		<p class="mt-4 text-center text-sm text-gray-500">
			This will be the only admin account. You can add more users later.
		</p>
	</Container>
</div>
