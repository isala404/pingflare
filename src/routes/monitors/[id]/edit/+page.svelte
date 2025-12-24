<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { CreateMonitorInput } from '$lib/types/monitor';
	import type { PageData } from './$types';
	import MonitorForm from '$lib/components/MonitorForm.svelte';

	let { data }: { data: PageData } = $props();

	let error = $state('');
	let saving = $state(false);

	async function handleSave(formData: FormData) {
		error = '';
		saving = true;

		try {
			const updateData: CreateMonitorInput = {
				name: formData.get('name') as string,
				script: formData.get('script') as string,
				interval_seconds: formData.get('interval_seconds')
					? parseInt(formData.get('interval_seconds') as string, 10)
					: undefined,
				timeout_ms: formData.get('timeout_ms')
					? parseInt(formData.get('timeout_ms') as string, 10)
					: undefined,
				active: formData.get('active') === '1'
			};

			const response = await fetch(`/api/monitors/${data.monitor.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updateData)
			});

			if (!response.ok) {
				const errData = (await response.json()) as { error?: string };
				throw new Error(errData.error || 'Failed to update monitor');
			}

			await goto(resolve('/'));
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to update monitor';
		} finally {
			saving = false;
		}
	}

	function handleCancel() {
		goto(resolve('/'));
	}
</script>

<svelte:head>
	<title>Edit {data.monitor.name} - Pingflare</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<header class="border-b border-gray-200 bg-white">
		<div class="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
			<div class="flex items-center gap-4">
				<a href={resolve('/')} class="flex items-center gap-2 text-gray-600 hover:text-gray-900">
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10 19l-7-7m0 0l7-7m-7 7h18"
						/>
					</svg>
					Back
				</a>
				<div class="h-6 w-px bg-gray-200"></div>
				<h1 class="text-xl font-semibold text-gray-900">Edit Monitor</h1>
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
		{#if error}
			<div class="mb-6 rounded-md bg-red-50 p-4 text-red-700">{error}</div>
		{/if}

		<div class="rounded-lg bg-white p-6 shadow-sm">
			<MonitorForm monitor={data.monitor} onSave={handleSave} onCancel={handleCancel} />
		</div>

		{#if saving}
			<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
				<div class="rounded-lg bg-white p-4 shadow-lg">
					<div class="flex items-center gap-3">
						<div
							class="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"
						></div>
						<span class="text-gray-700">Saving changes...</span>
					</div>
				</div>
			</div>
		{/if}
	</main>
</div>
