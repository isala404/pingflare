<script lang="ts">
	import { onMount } from 'svelte';
	import { Button, Spinner } from '$lib/components/ui';

	interface Props {
		onSubscriptionChange?: () => void;
	}

	let { onSubscriptionChange }: Props = $props();

	type PushState = 'loading' | 'unsupported' | 'denied' | 'disabled' | 'enabled';

	let pushState: PushState = $state('loading');
	let isSubscribing = $state(false);
	let registration: ServiceWorkerRegistration | null = null;

	function getBrowserName(): string {
		const ua = navigator.userAgent;

		// Try to get browser name from the end of user agent (most reliable part)
		// e.g., "Chrome/120.0.0.0" from "Mozilla/5.0 ... Chrome/120.0.0.0 Safari/537.36"
		try {
			const lastPart = ua.split(') ').pop() ?? '';
			const browserPart = lastPart.split('/')[0]?.trim();
			if (browserPart && browserPart !== 'Safari' && browserPart.length < 20) {
				return browserPart;
			}
		} catch {
			// Fall through to detection
		}

		// Fallback: detect common browsers
		if (ua.includes('Firefox')) return 'Firefox';
		if (ua.includes('Edg')) return 'Edge';
		if (ua.includes('Chrome')) return 'Chrome';
		if (ua.includes('Safari')) return 'Safari';
		return 'Browser';
	}

	function getPlatformName(): string {
		// Try modern API first
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const uaData = (navigator as any).userAgentData;
		if (uaData?.platform) {
			return uaData.platform;
		}

		// Fallback: parse from userAgent
		const ua = navigator.userAgent;
		if (ua.includes('Windows')) return 'Windows';
		if (ua.includes('Mac')) return 'macOS';
		if (ua.includes('Linux')) return 'Linux';
		if (ua.includes('Android')) return 'Android';
		if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
		return '';
	}

	function getSubscriptionName(): string {
		const browser = getBrowserName();
		const platform = getPlatformName();
		return platform ? `${browser} - ${platform}` : browser;
	}

	onMount(async () => {
		if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
			pushState = 'unsupported';
			return;
		}

		if (Notification.permission === 'denied') {
			pushState = 'denied';
			return;
		}

		try {
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
				body: JSON.stringify({
					...subscription.toJSON(),
					name: getSubscriptionName()
				})
			});

			pushState = 'enabled';
			onSubscriptionChange?.();
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
			onSubscriptionChange?.();
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
		<Spinner size="sm" />
	{:else if pushState === 'unsupported'}
		<span class="text-sm text-gray-500">Push not supported</span>
	{:else if pushState === 'denied'}
		<span class="text-sm text-red-600">Notifications blocked</span>
	{:else if pushState === 'disabled'}
		<Button size="sm" loading={isSubscribing} onclick={enablePush}>
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
				/>
			</svg>
			{isSubscribing ? 'Enabling...' : 'Enable Notifications'}
		</Button>
	{:else if pushState === 'enabled'}
		<div class="flex items-center gap-3">
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
			<Button variant="ghost" size="sm" loading={isSubscribing} onclick={disablePush}>
				Disable
			</Button>
		</div>
	{/if}
</div>
