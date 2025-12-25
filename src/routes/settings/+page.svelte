<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import { AppShell, Container, PageHeader } from '$lib/components/layout';
	import { Card, Input, Button, Alert } from '$lib/components/ui';

	let { data }: { data: PageData } = $props();

	// Profile form
	let name = $state('');
	let nameInitialized = $state(false);
	let profileError = $state('');
	let profileSuccess = $state('');
	let savingProfile = $state(false);

	// Sync name with user data when it becomes available
	$effect(() => {
		if (data.user?.name && !nameInitialized) {
			name = data.user.name;
			nameInitialized = true;
		}
	});

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
		await goto('/login');
	}
</script>

<svelte:head>
	<title>Settings - Pingflare</title>
</svelte:head>

<AppShell user={data.user}>
	<Container size="md">
		<PageHeader title="Settings" subtitle="Manage your account" />

		<div class="space-y-6">
			<!-- Profile Section -->
			<Card>
				{#snippet header()}
					<h2 class="text-lg font-semibold text-gray-900">Profile</h2>
				{/snippet}

				{#if profileError}
					<div class="mb-4">
						<Alert variant="error" dismissible ondismiss={() => (profileError = '')}
							>{profileError}</Alert
						>
					</div>
				{/if}

				{#if profileSuccess}
					<div class="mb-4">
						<Alert variant="success" dismissible ondismiss={() => (profileSuccess = '')}
							>{profileSuccess}</Alert
						>
					</div>
				{/if}

				<form onsubmit={handleProfileSubmit} class="space-y-4">
					<Input type="text" name="name" label="Name" bind:value={name} required />

					<Input
						type="email"
						name="email"
						label="Email"
						value={data.user?.email ?? ''}
						disabled
						helper="Email cannot be changed"
					/>

					<Button type="submit" loading={savingProfile}>
						{savingProfile ? 'Saving...' : 'Save Profile'}
					</Button>
				</form>
			</Card>

			<!-- Password Section -->
			<Card>
				{#snippet header()}
					<h2 class="text-lg font-semibold text-gray-900">Change Password</h2>
				{/snippet}

				{#if passwordError}
					<div class="mb-4">
						<Alert variant="error" dismissible ondismiss={() => (passwordError = '')}
							>{passwordError}</Alert
						>
					</div>
				{/if}

				{#if passwordSuccess}
					<div class="mb-4">
						<Alert variant="success" dismissible ondismiss={() => (passwordSuccess = '')}
							>{passwordSuccess}</Alert
						>
					</div>
				{/if}

				<form onsubmit={handlePasswordSubmit} class="space-y-4">
					<Input
						type="password"
						name="currentPassword"
						label="Current Password"
						bind:value={currentPassword}
						autocomplete="current-password"
					/>

					<Input
						type="password"
						name="newPassword"
						label="New Password"
						placeholder="Minimum 8 characters"
						bind:value={newPassword}
						autocomplete="new-password"
					/>

					<Input
						type="password"
						name="confirmPassword"
						label="Confirm New Password"
						bind:value={confirmPassword}
						autocomplete="new-password"
					/>

					<Button type="submit" loading={savingPassword}>
						{savingPassword ? 'Updating...' : 'Update Password'}
					</Button>
				</form>
			</Card>

			<!-- Account Section -->
			<Card>
				{#snippet header()}
					<h2 class="text-lg font-semibold text-gray-900">Account</h2>
				{/snippet}

				<p class="mb-4 text-sm text-gray-600">
					Role: <span class="font-medium capitalize">{data.user?.role}</span>
				</p>
				<Button variant="danger" onclick={handleLogout}>Sign Out</Button>
			</Card>
		</div>
	</Container>
</AppShell>
