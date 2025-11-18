<script lang="ts">
	import { requestNotificationPermission, showLocalNotification } from '$lib/pwa';
	import { onMount } from 'svelte';

	let notificationPermission = $state<NotificationPermission>('default');
	let statusMessage = $state('');

	onMount(async () => {
		if ('Notification' in window) {
			notificationPermission = Notification.permission;
		}
	});

	async function handleRequestPermission() {
		const granted = await requestNotificationPermission();
		notificationPermission = Notification.permission;

		if (granted) {
			statusMessage = '✅ Notification permission granted!';
		} else {
			statusMessage = '❌ Notification permission denied';
		}

		setTimeout(() => {
			statusMessage = '';
		}, 3000);
	}

	async function handleShowNotification() {
		try {
			await showLocalNotification('Pingflare Notification', {
				body: 'This is a test notification from Pingflare!',
				badge: '/icon.svg',
				icon: '/icon.svg'
			});
			statusMessage = '✅ Notification sent!';
		} catch (error) {
			statusMessage = '❌ Failed to show notification';
			console.error(error);
		}

		setTimeout(() => {
			statusMessage = '';
		}, 3000);
	}

	let permissionColor = $derived(
		notificationPermission === 'granted'
			? 'bg-green-100 text-green-800'
			: notificationPermission === 'denied'
				? 'bg-red-100 text-red-800'
				: 'bg-yellow-100 text-yellow-800'
	);
</script>

<div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
	<div class="mb-4 flex items-center justify-between">
		<h3 class="text-lg font-semibold text-gray-900">PWA Notifications</h3>
		<span class="rounded-full px-3 py-1 text-xs font-medium {permissionColor}">
			{notificationPermission}
		</span>
	</div>

	<p class="mb-4 text-sm text-gray-600">
		Test push notification functionality. Make sure to grant permission first.
	</p>

	<div class="space-y-3">
		{#if notificationPermission !== 'granted'}
			<button
				onclick={handleRequestPermission}
				class="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
			>
				Request Notification Permission
			</button>
		{:else}
			<button
				onclick={handleShowNotification}
				class="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:outline-none"
			>
				Show Test Notification
			</button>
		{/if}

		{#if statusMessage}
			<div
				class="rounded-md border border-blue-200 bg-blue-50 p-3 text-center text-sm text-blue-800"
			>
				{statusMessage}
			</div>
		{/if}
	</div>

	<div class="mt-4 rounded-md bg-gray-50 p-3">
		<p class="text-xs text-gray-600">
			<strong>Note:</strong> For production push notifications, you'll need to:
		</p>
		<ul class="mt-2 space-y-1 text-xs text-gray-600">
			<li>• Generate VAPID keys using <code class="rounded bg-gray-200 px-1">web-push</code></li>
			<li>• Set up a backend endpoint to send notifications</li>
			<li>• Subscribe users with your VAPID public key</li>
		</ul>
	</div>
</div>
