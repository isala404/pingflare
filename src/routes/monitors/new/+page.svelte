<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { CreateMonitorInput } from '$lib/types/monitor';
	import type { PageData } from './$types';
	import MonitorForm from '$lib/components/MonitorForm.svelte';
	import { AppShell, Container, PageHeader } from '$lib/components/layout';
	import { Card, Alert, Spinner } from '$lib/components/ui';

	let { data }: { data: PageData } = $props();

	let error = $state('');
	let saving = $state(false);

	async function handleSave(formData: FormData) {
		error = '';
		saving = true;

		try {
			const notificationsJson = formData.get('notifications') as string;
			const notifications = notificationsJson ? JSON.parse(notificationsJson) : [];

			const monitorData: CreateMonitorInput & { notifications?: unknown[] } = {
				name: formData.get('name') as string,
				group_id: formData.get('group_id') as string,
				script: formData.get('script') as string,
				interval_seconds: formData.get('interval_seconds')
					? parseInt(formData.get('interval_seconds') as string, 10)
					: undefined,
				timeout_ms: formData.get('timeout_ms')
					? parseInt(formData.get('timeout_ms') as string, 10)
					: undefined,
				active: formData.get('active') === '1',
				notifications
			};

			const response = await fetch('/api/monitors', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(monitorData)
			});

			if (!response.ok) {
				const errData = (await response.json()) as { error?: string };
				throw new Error(errData.error || 'Failed to create monitor');
			}

			await goto(resolve('/'));
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create monitor';
		} finally {
			saving = false;
		}
	}

	function handleCancel() {
		goto(resolve('/'));
	}
</script>

<svelte:head>
	<title>Add Monitor - Pingflare</title>
</svelte:head>

<AppShell user={data.user}>
	<Container size="lg">
		<PageHeader title="Add Monitor" backHref="/" />

		{#if error}
			<div class="mb-6">
				<Alert variant="error" dismissible ondismiss={() => (error = '')}>{error}</Alert>
			</div>
		{/if}

		<Card padding="lg">
			<MonitorForm groups={data.groups} onSave={handleSave} onCancel={handleCancel} />
		</Card>

		{#if saving}
			<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
				<Card padding="md">
					<div class="flex items-center gap-3">
						<Spinner size="sm" />
						<span class="text-gray-700">Creating monitor...</span>
					</div>
				</Card>
			</div>
		{/if}
	</Container>
</AppShell>
