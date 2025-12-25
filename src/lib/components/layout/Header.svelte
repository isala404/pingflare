<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import type { UserPublic } from '$lib/types/auth';

	let { user = undefined }: { user?: UserPublic | null } = $props();

	let loggingOut = $state(false);

	async function handleLogout() {
		loggingOut = true;
		try {
			await fetch('/api/auth/logout', { method: 'POST' });
			await goto('/login');
		} finally {
			loggingOut = false;
		}
	}

	interface NavItem {
		href: string;
		label: string;
		match: (path: string) => boolean;
	}

	const navItems: NavItem[] = [
		{ href: '/', label: 'Dashboard', match: (path) => path === '/' },
		{
			href: '/admin/status',
			label: 'Status',
			match: (path) => path.startsWith('/admin/status') || path.startsWith('/announcements')
		},
		{
			href: '/notifications',
			label: 'Notifications',
			match: (path) => path.startsWith('/notifications')
		},
		{ href: '/settings', label: 'Settings', match: (path) => path.startsWith('/settings') }
	];

	const currentPath = $derived($page.url.pathname);
</script>

<header class="hidden border-b border-gray-200 bg-white md:block">
	<div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
		<div class="flex items-center gap-8">
			<a href="/" class="flex items-center gap-2">
				<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
						></path>
					</svg>
				</div>
				<span class="text-lg font-semibold text-gray-900">Pingflare</span>
			</a>

			<nav class="flex items-center gap-1">
				{#each navItems as item (item.href)}
					{@const isActive = item.match(currentPath)}
					<a
						href={item.href}
						class="rounded-lg px-3 py-2 text-sm font-medium transition-colors {isActive
							? 'bg-gray-100 text-gray-900'
							: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}"
						aria-current={isActive ? 'page' : undefined}
					>
						{item.label}
					</a>
				{/each}
			</nav>
		</div>

		{#if user}
			<div class="flex items-center gap-4">
				<span class="text-sm text-gray-600">{user.name}</span>
				<button
					type="button"
					onclick={handleLogout}
					disabled={loggingOut}
					class="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50"
				>
					{loggingOut ? 'Logging out...' : 'Log out'}
				</button>
			</div>
		{/if}
	</div>
</header>
