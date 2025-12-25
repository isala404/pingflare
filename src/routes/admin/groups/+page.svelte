<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';
	import type { MonitorGroup } from '$lib/types/group';
	import { AppShell, Container, PageHeader } from '$lib/components/layout';
	import { Button, Card, Alert } from '$lib/components/ui';

	let { data }: { data: PageData } = $props();

	let showForm = $state(false);
	let editingGroup = $state<MonitorGroup | null>(null);
	let error = $state('');
	let success = $state('');

	// Form fields
	let formName = $state('');
	let formSlug = $state('');
	let formDescription = $state('');
	let formIsPublic = $state(false);

	function generateSlug(name: string): string {
		return name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '');
	}

	function handleAdd() {
		editingGroup = null;
		formName = '';
		formSlug = '';
		formDescription = '';
		formIsPublic = false;
		showForm = true;
	}

	function handleEdit(group: MonitorGroup) {
		editingGroup = group;
		formName = group.name;
		formSlug = group.slug ?? '';
		formDescription = group.description ?? '';
		formIsPublic = group.is_public === 1;
		showForm = true;
	}

	function handleNameChange() {
		if (!editingGroup) {
			formSlug = generateSlug(formName);
		}
	}

	async function handleSave() {
		if (!formName.trim()) {
			error = 'Group name is required';
			return;
		}
		if (!formSlug.trim()) {
			error = 'Slug is required';
			return;
		}

		error = '';
		success = '';

		try {
			const method = editingGroup ? 'PUT' : 'POST';
			const url = editingGroup ? `/api/groups/${editingGroup.id}` : '/api/groups';

			const response = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: formName.trim(),
					slug: formSlug.trim(),
					description: formDescription.trim() || null,
					is_public: formIsPublic
				})
			});

			if (!response.ok) {
				const respData = (await response.json()) as { error?: string };
				throw new Error(respData.error ?? 'Failed to save group');
			}

			success = editingGroup ? 'Group updated successfully' : 'Group created successfully';
			showForm = false;
			editingGroup = null;
			formName = '';
			formSlug = '';
			formDescription = '';
			formIsPublic = false;
			await invalidateAll();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to save';
		}
	}

	async function handleDelete(group: MonitorGroup & { monitor_count: number }) {
		if (group.monitor_count > 0) {
			error = `Cannot delete "${group.name}" - it has ${group.monitor_count} monitor(s). Move or delete them first.`;
			return;
		}

		if (!confirm(`Are you sure you want to delete "${group.name}"?`)) {
			return;
		}

		error = '';
		success = '';

		try {
			const response = await fetch(`/api/groups/${group.id}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const data = (await response.json()) as { error?: string };
				throw new Error(data.error ?? 'Failed to delete group');
			}

			success = 'Group deleted successfully';
			await invalidateAll();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to delete';
		}
	}

	function handleCancel() {
		showForm = false;
		editingGroup = null;
		formName = '';
		formSlug = '';
		formDescription = '';
		formIsPublic = false;
	}
</script>

<svelte:head>
	<title>Manage Groups - Pingflare</title>
</svelte:head>

<AppShell user={data.user}>
	<Container>
		<PageHeader title="Monitor Groups" backHref="/admin/status">
			{#snippet actions()}
				<Button onclick={handleAdd}>Add Group</Button>
			{/snippet}
		</PageHeader>

		{#if error}
			<div class="mb-6">
				<Alert variant="error" dismissible ondismiss={() => (error = '')}>{error}</Alert>
			</div>
		{/if}

		{#if success}
			<div class="mb-6">
				<Alert variant="success" dismissible ondismiss={() => (success = '')}>{success}</Alert>
			</div>
		{/if}

		<!-- Add/Edit Form -->
		{#if showForm}
			<Card class="mb-6">
				<h3 class="mb-4 text-lg font-semibold text-gray-900">
					{editingGroup ? 'Edit Group' : 'Add New Group'}
				</h3>
				<div class="space-y-4">
					<div>
						<label for="name" class="block text-sm font-medium text-gray-700">Name</label>
						<input
							id="name"
							type="text"
							bind:value={formName}
							oninput={handleNameChange}
							placeholder="e.g., API Services, Databases"
							class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
						/>
					</div>
					<div>
						<label for="slug" class="block text-sm font-medium text-gray-700">Slug</label>
						<div class="mt-1 flex rounded-md shadow-sm">
							<span
								class="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-500"
							>
								/status/
							</span>
							<input
								id="slug"
								type="text"
								bind:value={formSlug}
								placeholder="api-services"
								class="block w-full rounded-r-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
							/>
						</div>
						<p class="mt-1 text-xs text-gray-500">
							URL-friendly identifier for the public status page
						</p>
					</div>
					<div>
						<label for="description" class="block text-sm font-medium text-gray-700"
							>Description (optional)</label
						>
						<input
							id="description"
							type="text"
							bind:value={formDescription}
							placeholder="Brief description of this group"
							class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
						/>
					</div>
					<div class="flex items-center gap-2">
						<input
							type="checkbox"
							id="isPublic"
							bind:checked={formIsPublic}
							class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
						/>
						<label for="isPublic" class="text-sm font-medium text-gray-700"
							>Show on Public Status Page</label
						>
					</div>
					<div class="flex justify-end gap-2">
						<Button variant="secondary" onclick={handleCancel}>Cancel</Button>
						<Button onclick={handleSave}>{editingGroup ? 'Update' : 'Create'}</Button>
					</div>
				</div>
			</Card>
		{/if}

		<!-- Groups List -->
		{#if data.groups.length > 0}
			<div class="space-y-3">
				{#each data.groups as group}
					<Card>
						<div class="flex items-center justify-between">
							<div>
								<div class="flex items-center gap-2">
									<h4 class="font-semibold text-gray-900">{group.name}</h4>
									{#if group.is_public}
										<span
											class="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
											>Public</span
										>
									{:else}
										<span
											class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
											>Private</span
										>
									{/if}
								</div>
								{#if group.description}
									<p class="text-sm text-gray-500">{group.description}</p>
								{/if}
								<p class="mt-1 text-xs text-gray-400">
									{group.monitor_count} monitor{group.monitor_count === 1 ? '' : 's'}
									{#if group.slug}
										<span class="ml-2 text-gray-300">|</span>
										<span class="ml-2 font-mono">/status/{group.slug}</span>
									{/if}
								</p>
							</div>
							<div class="flex gap-2">
								<Button size="sm" variant="secondary" onclick={() => handleEdit(group)}>Edit</Button
								>
								<Button size="sm" variant="danger" onclick={() => handleDelete(group)}
									>Delete</Button
								>
							</div>
						</div>
					</Card>
				{/each}
			</div>
		{:else if !showForm}
			<Card class="text-center" padding="lg">
				<div class="py-8">
					<svg
						class="mx-auto h-12 w-12 text-gray-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
						/>
					</svg>
					<h3 class="mt-2 text-sm font-medium text-gray-900">No groups yet</h3>
					<p class="mt-1 text-sm text-gray-500">Create a group to organize your monitors.</p>
					<div class="mt-4">
						<Button onclick={handleAdd}>Add Group</Button>
					</div>
				</div>
			</Card>
		{/if}
	</Container>
</AppShell>
