<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Container } from '$lib/components/layout';
	import { Card, Input, Button, Alert } from '$lib/components/ui';

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

			const data = (await response.json()) as { error?: string };

			if (!response.ok) {
				error = data.error || 'Login failed';
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
	<title>Login - Pingflare</title>
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
			<h1 class="mt-4 text-2xl font-bold text-gray-900">Pingflare</h1>
			<p class="mt-1 text-gray-600">Sign in to your account</p>
		</div>

		<Card class="mt-8" padding="lg">
			{#if error}
				<div class="mb-4">
					<Alert variant="error">{error}</Alert>
				</div>
			{/if}

			<form onsubmit={handleSubmit} class="space-y-4">
				<Input
					type="email"
					name="email"
					label="Email"
					placeholder="you@example.com"
					bind:value={email}
					required
				/>

				<Input
					type="password"
					name="password"
					label="Password"
					placeholder="Enter your password"
					bind:value={password}
					required
				/>

				<Button type="submit" loading={isSubmitting} class="w-full">
					{isSubmitting ? 'Signing in...' : 'Sign in'}
				</Button>
			</form>
		</Card>
	</Container>
</div>
