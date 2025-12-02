<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Profile form
	let name = $state(data.user?.name ?? '');
	let profileError = $state('');
	let profileSuccess = $state('');
	let savingProfile = $state(false);

	// Password form
	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let passwordError = $state('');
	let passwordSuccess = $state('');
	let savingPassword = $state(false);

	async function handleProfileSubmit(e: Event) {
		e.preventDefault();
		profileError = '';
		profileSuccess = '';

		if (!name || name.length < 2) {
			profileError = 'Name must be at least 2 characters';
			return;
		}

		savingProfile = true;

		try {
			const response = await fetch('/api/auth/profile', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name })
			});

			const result = (await response.json()) as { error?: string; success?: boolean };

			if (!response.ok) {
				profileError = result.error || 'Failed to update profile';
				return;
			}

			profileSuccess = 'Profile updated successfully';
		} catch {
			profileError = 'An error occurred. Please try again.';
		} finally {
			savingProfile = false;
		}
	}

	async function handlePasswordSubmit(e: Event) {
		e.preventDefault();
		passwordError = '';
		passwordSuccess = '';

		if (!currentPassword || !newPassword || !confirmPassword) {
			passwordError = 'All password fields are required';
			return;
		}

		if (newPassword.length < 8) {
			passwordError = 'New password must be at least 8 characters';
			return;
		}

		if (newPassword !== confirmPassword) {
			passwordError = 'New passwords do not match';
			return;
		}

		savingPassword = true;

		try {
			const response = await fetch('/api/auth/password', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ currentPassword, newPassword })
			});

			const result = (await response.json()) as { error?: string; success?: boolean };

			if (!response.ok) {
				passwordError = result.error || 'Failed to update password';
				return;
			}

			passwordSuccess = 'Password updated successfully';
			currentPassword = '';
			newPassword = '';
			confirmPassword = '';
		} catch {
			passwordError = 'An error occurred. Please try again.';
		} finally {
			savingPassword = false;
		}
	}

	async function handleLogout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		await goto(resolve('/login'));
	}
</script>

<svelte:head>
	<title>Settings - Pingflare</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<header class="border-b border-gray-200 bg-white">
		<div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
			<div>
				<h1 class="text-2xl font-bold text-gray-900">Settings</h1>
				<p class="text-sm text-gray-500">Manage your account</p>
			</div>
			<div class="flex items-center gap-3">
				<a
					href={resolve('/')}
					class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
				>
					Back to Dashboard
				</a>
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8">
		<!-- Profile Section -->
		<div class="mb-8 rounded-lg bg-white p-6 shadow-sm">
			<h2 class="mb-4 text-lg font-semibold text-gray-900">Profile</h2>

			{#if profileError}
				<div class="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{profileError}</div>
			{/if}

			{#if profileSuccess}
				<div class="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700">{profileSuccess}</div>
			{/if}

			<form onsubmit={handleProfileSubmit} class="space-y-4">
				<div>
					<label for="name" class="block text-sm font-medium text-gray-700">Name</label>
					<input
						type="text"
						id="name"
						bind:value={name}
						class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
					/>
				</div>

				<div>
					<label for="email" class="block text-sm font-medium text-gray-700">Email</label>
					<input
						type="email"
						id="email"
						value={data.user?.email ?? ''}
						disabled
						class="mt-1 block w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-gray-500"
					/>
					<p class="mt-1 text-xs text-gray-500">Email cannot be changed</p>
				</div>

				<button
					type="submit"
					disabled={savingProfile}
					class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
				>
					{savingProfile ? 'Saving...' : 'Save Profile'}
				</button>
			</form>
		</div>

		<!-- Password Section -->
		<div class="mb-8 rounded-lg bg-white p-6 shadow-sm">
			<h2 class="mb-4 text-lg font-semibold text-gray-900">Change Password</h2>

			{#if passwordError}
				<div class="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{passwordError}</div>
			{/if}

			{#if passwordSuccess}
				<div class="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700">{passwordSuccess}</div>
			{/if}

			<form onsubmit={handlePasswordSubmit} class="space-y-4">
				<div>
					<label for="currentPassword" class="block text-sm font-medium text-gray-700"
						>Current Password</label
					>
					<input
						type="password"
						id="currentPassword"
						bind:value={currentPassword}
						autocomplete="current-password"
						class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
					/>
				</div>

				<div>
					<label for="newPassword" class="block text-sm font-medium text-gray-700"
						>New Password</label
					>
					<input
						type="password"
						id="newPassword"
						bind:value={newPassword}
						autocomplete="new-password"
						class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
						placeholder="Minimum 8 characters"
					/>
				</div>

				<div>
					<label for="confirmNewPassword" class="block text-sm font-medium text-gray-700"
						>Confirm New Password</label
					>
					<input
						type="password"
						id="confirmNewPassword"
						bind:value={confirmPassword}
						autocomplete="new-password"
						class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
					/>
				</div>

				<button
					type="submit"
					disabled={savingPassword}
					class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
				>
					{savingPassword ? 'Updating...' : 'Update Password'}
				</button>
			</form>
		</div>

		<!-- Account Section -->
		<div class="rounded-lg bg-white p-6 shadow-sm">
			<h2 class="mb-4 text-lg font-semibold text-gray-900">Account</h2>
			<p class="mb-4 text-sm text-gray-600">
				Role: <span class="font-medium capitalize">{data.user?.role}</span>
			</p>
			<button
				onclick={handleLogout}
				class="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
			>
				Sign Out
			</button>
		</div>
	</main>
</div>
