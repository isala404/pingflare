<script lang="ts">
	import type { MonitorType, KeywordType, MonitorWithStatus } from '$lib/types/monitor';

	const defaultScript = `// Health check script
// The check function receives a context with fetch and log
async function check(ctx) {
  // Make HTTP request
  const response = await ctx.fetch('https://api.example.com/health');
  const data = await response.json();

  // Return status based on response
  if (data.status === 'healthy') {
    return { status: 'up' };
  }

  return {
    status: 'down',
    message: data.error || 'Service unhealthy'
  };
}`;

	let {
		monitor = null,
		onSave,
		onCancel
	}: {
		monitor?: MonitorWithStatus | null;
		onSave: (data: FormData) => void;
		onCancel: () => void;
	} = $props();

	let name = $state(monitor?.name ?? '');
	let type = $state<MonitorType>(monitor?.type ?? 'http');
	let url = $state(monitor?.url ?? '');
	let hostname = $state(monitor?.hostname ?? '');
	let port = $state(monitor?.port?.toString() ?? '');
	let method = $state(monitor?.method ?? 'GET');
	let expectedStatus = $state(monitor?.expected_status?.toString() ?? '200');
	let keyword = $state(monitor?.keyword ?? '');
	let keywordType = $state<KeywordType | ''>(monitor?.keyword_type ?? '');
	let intervalSeconds = $state(monitor?.interval_seconds?.toString() ?? '60');
	let timeoutMs = $state(monitor?.timeout_ms?.toString() ?? '30000');
	let active = $state(monitor?.active !== 0);
	let script = $state(monitor?.script ?? defaultScript);

	let isSubmitting = $state(false);
	let error = $state('');

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';

		if (!name.trim()) {
			error = 'Name is required';
			return;
		}

		if (type === 'http' && !url.trim()) {
			error = 'URL is required for HTTP monitors';
			return;
		}

		if (type === 'tcp' && (!hostname.trim() || !port.trim())) {
			error = 'Hostname and port are required for TCP monitors';
			return;
		}

		if (type === 'script' && !script.trim()) {
			error = 'Script is required for Script monitors';
			return;
		}

		if (type === 'script' && !script.includes('function check')) {
			error = 'Script must define a check(ctx) function';
			return;
		}

		isSubmitting = true;

		const formData = new FormData();
		formData.set('name', name.trim());
		formData.set('type', type);
		formData.set('url', url.trim());
		formData.set('hostname', hostname.trim());
		formData.set('port', port);
		formData.set('method', method);
		formData.set('expected_status', expectedStatus);
		formData.set('keyword', keyword.trim());
		formData.set('keyword_type', keywordType);
		formData.set('interval_seconds', intervalSeconds);
		formData.set('timeout_ms', timeoutMs);
		formData.set('active', active ? '1' : '0');
		formData.set('script', type === 'script' ? script : '');

		if (monitor?.id) {
			formData.set('id', monitor.id);
		}

		try {
			onSave(formData);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to save monitor';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<form onsubmit={handleSubmit} class="space-y-4">
	{#if error}
		<div class="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
	{/if}

	<div>
		<label for="name" class="block text-sm font-medium text-gray-700">Name</label>
		<input
			type="text"
			id="name"
			bind:value={name}
			class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
			placeholder="My Website"
		/>
	</div>

	<div>
		<label for="type" class="block text-sm font-medium text-gray-700">Type</label>
		<select
			id="type"
			bind:value={type}
			class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
		>
			<option value="http">HTTP/HTTPS</option>
			<option value="script">Script (JavaScript)</option>
			<option value="tcp">TCP</option>
			<option value="dns" disabled>DNS (coming soon)</option>
			<option value="push" disabled>Push (coming soon)</option>
		</select>
	</div>

	{#if type === 'http'}
		<div>
			<label for="url" class="block text-sm font-medium text-gray-700">URL</label>
			<input
				type="url"
				id="url"
				bind:value={url}
				class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
				placeholder="https://example.com"
			/>
		</div>

		<div class="grid grid-cols-2 gap-4">
			<div>
				<label for="method" class="block text-sm font-medium text-gray-700">Method</label>
				<select
					id="method"
					bind:value={method}
					class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
				>
					<option value="GET">GET</option>
					<option value="POST">POST</option>
					<option value="HEAD">HEAD</option>
					<option value="OPTIONS">OPTIONS</option>
				</select>
			</div>
			<div>
				<label for="expectedStatus" class="block text-sm font-medium text-gray-700"
					>Expected Status</label
				>
				<input
					type="number"
					id="expectedStatus"
					bind:value={expectedStatus}
					min="100"
					max="599"
					class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
				/>
			</div>
		</div>

		<div class="grid grid-cols-2 gap-4">
			<div>
				<label for="keyword" class="block text-sm font-medium text-gray-700"
					>Keyword (optional)</label
				>
				<input
					type="text"
					id="keyword"
					bind:value={keyword}
					class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
					placeholder="Search text"
				/>
			</div>
			<div>
				<label for="keywordType" class="block text-sm font-medium text-gray-700">Keyword Type</label
				>
				<select
					id="keywordType"
					bind:value={keywordType}
					class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
				>
					<option value="">None</option>
					<option value="present">Must be present</option>
					<option value="absent">Must be absent</option>
				</select>
			</div>
		</div>
	{/if}

	{#if type === 'script'}
		<div>
			<label for="script" class="block text-sm font-medium text-gray-700">
				Health Check Script
			</label>
			<p class="mb-2 text-xs text-gray-500">
				Write JavaScript to check health. Use <code class="bg-gray-100 px-1">ctx.fetch()</code> for
				HTTP requests. Return
				<code class="bg-gray-100 px-1">{`{ status: 'up' | 'down' | 'degraded' }`}</code>.
			</p>
			<textarea
				id="script"
				bind:value={script}
				rows="12"
				class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
				placeholder={defaultScript}
			></textarea>
		</div>
	{/if}

	{#if type === 'tcp'}
		<div class="grid grid-cols-2 gap-4">
			<div>
				<label for="hostname" class="block text-sm font-medium text-gray-700">Hostname</label>
				<input
					type="text"
					id="hostname"
					bind:value={hostname}
					class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
					placeholder="example.com"
				/>
			</div>
			<div>
				<label for="port" class="block text-sm font-medium text-gray-700">Port</label>
				<input
					type="number"
					id="port"
					bind:value={port}
					min="1"
					max="65535"
					class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
					placeholder="443"
				/>
			</div>
		</div>
	{/if}

	<div class="grid grid-cols-2 gap-4">
		<div>
			<label for="intervalSeconds" class="block text-sm font-medium text-gray-700"
				>Check Interval (seconds)</label
			>
			<input
				type="number"
				id="intervalSeconds"
				bind:value={intervalSeconds}
				min="30"
				max="3600"
				class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
			/>
		</div>
		<div>
			<label for="timeoutMs" class="block text-sm font-medium text-gray-700">Timeout (ms)</label>
			<input
				type="number"
				id="timeoutMs"
				bind:value={timeoutMs}
				min="1000"
				max="60000"
				class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
			/>
		</div>
	</div>

	<div class="flex items-center gap-2">
		<input
			type="checkbox"
			id="active"
			bind:checked={active}
			class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
		/>
		<label for="active" class="text-sm font-medium text-gray-700">Active</label>
	</div>

	<div class="flex justify-end gap-3 pt-4">
		<button
			type="button"
			onclick={onCancel}
			class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
		>
			Cancel
		</button>
		<button
			type="submit"
			disabled={isSubmitting}
			class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
		>
			{isSubmitting ? 'Saving...' : monitor ? 'Update' : 'Create'} Monitor
		</button>
	</div>
</form>
