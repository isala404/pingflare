<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';
	import type { Incident, IncidentStatus } from '$lib/types/status';
	import { AppShell, Container, PageHeader } from '$lib/components/layout';
	import { Button, Card, Alert } from '$lib/components/ui';

	let { data }: { data: PageData } = $props();

	let showNewForm = $state(false);
	let updatingIncidentId = $state<string | null>(null);
	let error = $state('');
	let success = $state('');

	// New incident form
	let newTitle = $state('');
	let newGroupId = $state(data.groups.length > 0 ? data.groups[0].id : '');
	let newStatus = $state<IncidentStatus>('investigating');
	let newMessage = $state('');

	// Update form
	let updateStatus = $state<IncidentStatus>('investigating');
	let updateMessage = $state('');

	const activeIncidents = $derived(data.incidents.filter((i) => i.status !== 'resolved'));
	const resolvedIncidents = $derived(data.incidents.filter((i) => i.status === 'resolved'));

	function formatTime(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getStatusColor(status: IncidentStatus): string {
		switch (status) {
			case 'investigating':
				return 'bg-red-100 text-red-700';
			case 'identified':
				return 'bg-orange-100 text-orange-700';
			case 'monitoring':
				return 'bg-blue-100 text-blue-700';
			case 'resolved':
				return 'bg-green-100 text-green-700';
		}
	}

	async function handleCreateIncident() {
		if (!newTitle.trim() || !newMessage.trim()) {
			error = 'Title and message are required';
			return;
		}
		if (!newGroupId) {
			error = 'Please select a group';
			return;
		}

		error = '';
		success = '';

		try {
			const response = await fetch('/api/incidents', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: newTitle.trim(),
					status: newStatus,
					message: newMessage.trim(),
					group_id: newGroupId
				})
			});

			if (!response.ok) {
				const errData = (await response.json()) as { error?: string };
				throw new Error(errData.error ?? 'Failed to create incident');
			}

			success = 'Incident created successfully';
			newTitle = '';
			newGroupId = data.groups.length > 0 ? data.groups[0].id : '';
			newStatus = 'investigating';
			newMessage = '';
			showNewForm = false;
			await invalidateAll();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create incident';
		}
	}

	async function handleAddUpdate(incidentId: string) {
		if (!updateMessage.trim()) {
			error = 'Update message is required';
			return;
		}

		error = '';
		success = '';

		try {
			const response = await fetch(`/api/incidents/${incidentId}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					status: updateStatus,
					message: updateMessage.trim()
				})
			});

			if (!response.ok) {
				const data = (await response.json()) as { error?: string };
				throw new Error(data.error ?? 'Failed to add update');
			}

			success = 'Update added successfully';
			updateStatus = 'investigating';
			updateMessage = '';
			updatingIncidentId = null;
			await invalidateAll();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to add update';
		}
	}

	async function handleDelete(incident: Incident) {
		if (!confirm(`Are you sure you want to delete "${incident.title}"?`)) {
			return;
		}

		error = '';
		success = '';

		try {
			const response = await fetch(`/api/incidents/${incident.id}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const data = (await response.json()) as { error?: string };
				throw new Error(data.error ?? 'Failed to delete incident');
			}

			success = 'Incident deleted successfully';
			await invalidateAll();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to delete';
		}
	}

	function startUpdate(incident: Incident) {
		updatingIncidentId = incident.id;
		updateStatus = incident.status;
		updateMessage = '';
	}
</script>

<svelte:head>
	<title>Manage Incidents - Pingflare</title>
</svelte:head>

<AppShell user={data.user}>
	<Container>
		<PageHeader title="Incidents" backHref="/admin/status">
			{#snippet actions()}
				<Button
					onclick={() => {
						showNewForm = true;
					}}>Report Incident</Button
				>
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

		<!-- New Incident Form -->
		{#if showNewForm}
			<Card class="mb-6">
				<h3 class="mb-4 text-lg font-semibold text-gray-900">Report New Incident</h3>
				<div class="space-y-4">
					<div>
						<label for="title" class="block text-sm font-medium text-gray-700">Title</label>
						<input
							id="title"
							type="text"
							bind:value={newTitle}
							placeholder="Brief description of the incident"
							class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
						/>
					</div>
					<div>
						<label for="group" class="block text-sm font-medium text-gray-700">Affected Group</label
						>
						<select
							id="group"
							bind:value={newGroupId}
							class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
							required
						>
							{#each data.groups as group}
								<option value={group.id}>{group.name}</option>
							{/each}
						</select>
						{#if data.groups.length === 0}
							<p class="mt-1 text-sm text-red-500">
								No groups available. <a href="/admin/groups" class="underline"
									>Create a group first.</a
								>
							</p>
						{/if}
					</div>
					<div>
						<label for="status" class="block text-sm font-medium text-gray-700">Status</label>
						<select
							id="status"
							bind:value={newStatus}
							class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
						>
							<option value="investigating">Investigating</option>
							<option value="identified">Identified</option>
							<option value="monitoring">Monitoring</option>
							<option value="resolved">Resolved</option>
						</select>
					</div>
					<div>
						<label for="message" class="block text-sm font-medium text-gray-700"
							>Initial Update</label
						>
						<textarea
							id="message"
							bind:value={newMessage}
							rows={3}
							placeholder="What happened? What are the next steps?"
							class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
						></textarea>
					</div>
					<div class="flex justify-end gap-2">
						<Button
							variant="secondary"
							onclick={() => {
								showNewForm = false;
							}}>Cancel</Button
						>
						<Button onclick={handleCreateIncident} disabled={data.groups.length === 0}
							>Create Incident</Button
						>
					</div>
				</div>
			</Card>
		{/if}

		<!-- Active Incidents -->
		{#if activeIncidents.length > 0}
			<div class="mb-8">
				<h3 class="mb-4 text-lg font-semibold text-gray-900">Active Incidents</h3>
				<div class="space-y-4">
					{#each activeIncidents as incident}
						<Card>
							<div class="flex items-start justify-between">
								<div class="flex-1">
									<div class="flex items-center gap-2">
										<h4 class="font-semibold text-gray-900">{incident.title}</h4>
										<span
											class="rounded-full px-2 py-0.5 text-xs font-medium {getStatusColor(
												incident.status
											)}"
										>
											{incident.status.charAt(0).toUpperCase() + incident.status.slice(1)}
										</span>
										{#if incident.group_name}
											<span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
												>{incident.group_name}</span
											>
										{/if}
									</div>
									<p class="mt-1 text-xs text-gray-500">
										Started {formatTime(incident.created_at)}
									</p>
								</div>
								<div class="flex gap-2">
									<Button size="sm" variant="secondary" onclick={() => startUpdate(incident)}
										>Add Update</Button
									>
									<Button size="sm" variant="danger" onclick={() => handleDelete(incident)}
										>Delete</Button
									>
								</div>
							</div>

							<!-- Update Form -->
							{#if updatingIncidentId === incident.id}
								<div class="mt-4 border-t border-gray-200 pt-4">
									<div class="space-y-3">
										<div>
											<label class="block text-sm font-medium text-gray-700">New Status</label>
											<select
												bind:value={updateStatus}
												class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
											>
												<option value="investigating">Investigating</option>
												<option value="identified">Identified</option>
												<option value="monitoring">Monitoring</option>
												<option value="resolved">Resolved</option>
											</select>
										</div>
										<div>
											<label class="block text-sm font-medium text-gray-700">Update Message</label>
											<textarea
												bind:value={updateMessage}
												rows={2}
												placeholder="What's the latest update?"
												class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
											></textarea>
										</div>
										<div class="flex justify-end gap-2">
											<Button
												size="sm"
												variant="secondary"
												onclick={() => {
													updatingIncidentId = null;
												}}>Cancel</Button
											>
											<Button size="sm" onclick={() => handleAddUpdate(incident.id)}
												>Post Update</Button
											>
										</div>
									</div>
								</div>
							{/if}

							<!-- Timeline -->
							{#if incident.updates.length > 0}
								<div class="mt-4 border-t border-gray-200 pt-4">
									<div class="space-y-3">
										{#each incident.updates as update}
											<div class="flex gap-3">
												<div class="flex flex-col items-center">
													<div
														class="h-2 w-2 rounded-full {getStatusColor(update.status)
															.replace('text-', 'bg-')
															.replace('-100', '-500')
															.replace('-700', '-500')}"
													></div>
													<div class="flex-1 w-px bg-gray-200"></div>
												</div>
												<div class="flex-1 pb-3">
													<p class="text-sm">
														<span class="font-medium capitalize">{update.status}</span>
														<span class="text-gray-500"> - {update.message}</span>
													</p>
													<p class="mt-0.5 text-xs text-gray-400">
														{formatTime(update.created_at)}
													</p>
												</div>
											</div>
										{/each}
									</div>
								</div>
							{/if}
						</Card>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Resolved Incidents -->
		{#if resolvedIncidents.length > 0}
			<div>
				<h3 class="mb-4 text-lg font-semibold text-gray-900">Resolved Incidents</h3>
				<div class="space-y-4">
					{#each resolvedIncidents as incident}
						<Card class="opacity-75">
							<div class="flex items-start justify-between">
								<div class="flex-1">
									<div class="flex items-center gap-2">
										<h4 class="font-semibold text-gray-700">{incident.title}</h4>
										<span
											class="rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700"
										>
											Resolved
										</span>
										{#if incident.group_name}
											<span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
												>{incident.group_name}</span
											>
										{/if}
									</div>
									<p class="mt-1 text-xs text-gray-500">
										{formatTime(incident.created_at)}
										{#if incident.resolved_at}
											- Resolved {formatTime(incident.resolved_at)}
										{/if}
									</p>
								</div>
								<Button size="sm" variant="danger" onclick={() => handleDelete(incident)}
									>Delete</Button
								>
							</div>

							<!-- Collapsed Timeline -->
							{#if incident.updates.length > 0}
								<div class="mt-3 text-sm text-gray-600">
									<p>{incident.updates.length} update{incident.updates.length === 1 ? '' : 's'}</p>
								</div>
							{/if}
						</Card>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Empty State -->
		{#if data.incidents.length === 0 && !showNewForm}
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
							d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<h3 class="mt-2 text-sm font-medium text-gray-900">No incidents</h3>
					<p class="mt-1 text-sm text-gray-500">
						All systems are operating normally. Report an incident when issues occur.
					</p>
					<div class="mt-4">
						<Button
							onclick={() => {
								showNewForm = true;
							}}>Report Incident</Button
						>
					</div>
				</div>
			</Card>
		{/if}
	</Container>
</AppShell>
