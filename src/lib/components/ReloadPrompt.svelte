<script lang="ts">
	import { useRegisterSW } from 'virtual:pwa-register/svelte';

	const { needRefresh, updateServiceWorker } = useRegisterSW({
		onRegistered(registration) {
			console.log('SW Registered:', registration);
		},
		onRegisterError(error) {
			console.error('SW registration error', error);
		}
	});

	// Auto-reload when new content is available
	$effect(() => {
		if ($needRefresh) {
			updateServiceWorker(true);
		}
	});
</script>
