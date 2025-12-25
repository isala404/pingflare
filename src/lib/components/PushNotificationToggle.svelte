<script lang="ts">
	import { onMount } from 'svelte';

	type PushState = 'loading' | 'unsupported' | 'denied' | 'disabled' | 'enabled';

	let pushState: PushState = $state('loading');
	let isSubscribing = $state(false);
	let registration: ServiceWorkerRegistration | null = null;

	onMount(async () => {
		// Check browser support
		if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
			pushState = 'unsupported';
			return;
		}

		if (Notification.permission === 'denied') {
			pushState = 'denied';
			return;
		}

		// Use the existing PWA service worker (which imports sw-push.js)
		try {
			// Wait for the service worker to be ready
			registration = await navigator.serviceWorker.ready;
			const subscription = await registration.pushManager.getSubscription();
			pushState = subscription ? 'enabled' : 'disabled';
		} catch {
			pushState = 'disabled';
		}
	});

	async function enablePush() {
		isSubscribing = true;
		try {
			const permission = await Notification.requestPermission();
			if (permission !== 'granted') {
				pushState = 'denied';
				return;
			}

			// Use the existing service worker registration
			if (!registration) {
				registration = await navigator.serviceWorker.ready;
			}

			const response = await fetch('/api/push/vapid-key');
			const data = (await response.json()) as { publicKey: string };

			const subscription = await registration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlBase64ToUint8Array(data.publicKey).buffer as ArrayBuffer
			});

			await fetch('/api/push/subscribe', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(subscription.toJSON())
			});

			pushState = 'enabled';
		} catch (err) {
			console.error('Failed to enable push notifications:', err);
		} finally {
			isSubscribing = false;
		}
	}

	async function disablePush() {
		if (!registration) return;

		isSubscribing = true;
		try {
			const subscription = await registration.pushManager.getSubscription();
			if (subscription) {
				await fetch('/api/push/subscribe', {
					method: 'DELETE',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ endpoint: subscription.endpoint })
				});
				await subscription.unsubscribe();
			}
			pushState = 'disabled';
		} catch (err) {
			console.error('Failed to disable push notifications:', err);
		} finally {
			isSubscribing = false;
		}
	}

	function urlBase64ToUint8Array(base64String: string): Uint8Array {
		const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
		const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
		const rawData = atob(base64);
		const outputArray = new Uint8Array(rawData.length);
		for (let i = 0; i < rawData.length; ++i) {
			outputArray[i] = rawData.charCodeAt(i);
		}
		return outputArray;
	}
</script>

<div class="flex items-center gap-2">
	{#if pushState === 'loading'}
		<div class="flex items-center gap-2 text-gray-500">
			<svg class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
				></circle>
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				></path>
			</svg>
		</div>
	{:else if pushState === 'unsupported'}
		<span class="text-sm text-gray-500">Push not supported</span>
	{:else if pushState === 'denied'}
		<span class="text-sm text-red-600">Notifications blocked</span>
	{:else if pushState === 'disabled'}
		<button
			onclick={enablePush}
			disabled={isSubscribing}
			class="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
		>
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
				/>
			</svg>
			{isSubscribing ? 'Enabling...' : 'Enable Notifications'}
		</button>
	{:else if pushState === 'enabled'}
		<div class="flex items-center gap-2">
			<span class="flex items-center gap-1.5 text-sm text-green-600">
				<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
						clip-rule="evenodd"
					/>
				</svg>
				Push enabled
			</span>
			<button
				onclick={disablePush}
				disabled={isSubscribing}
				class="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
			>
				Disable
			</button>
		</div>
	{/if}
</div>
