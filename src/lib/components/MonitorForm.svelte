<script lang="ts">
	import { onMount } from 'svelte';
	import type { MonitorWithStatus } from '$lib/types/monitor';
	import type { MonitorGroup } from '$lib/types/group';
	import type { ScriptDSL } from '$lib/types/script';
	import type { NotificationChannel, MonitorNotificationInput } from '$lib/types/notification';
	import { getDefaultScript, scriptToJson, jsonToScript } from '$lib/types/script';
	import { Input, Button, Alert } from '$lib/components/ui';
	import ScriptBuilder from './ScriptBuilder.svelte';
	import ScriptEditor from './ScriptEditor.svelte';
	import MonitorNotificationConfig from './MonitorNotificationConfig.svelte';

	let {
		monitor = null,
		groups = [],
		onSave,
		onCancel
	}: {
		monitor?: MonitorWithStatus | null;
		groups?: MonitorGroup[];
		onSave: (data: FormData) => void;
		onCancel: () => void;
	} = $props();

	// Parse existing script or use default
	function getInitialScript(): ScriptDSL {
		if (monitor?.script) {
			const parsed = jsonToScript(monitor.script);
			if (parsed) return parsed;
		}
		return getDefaultScript();
	}

	let name = $state(monitor?.name ?? '');
	let groupId = $state(monitor?.group_id ?? (groups.length > 0 ? groups[0].id : ''));
	let intervalSeconds = $state(monitor?.interval_seconds?.toString() ?? '60');
	let timeoutMs = $state(monitor?.timeout_ms?.toString() ?? '30000');
	let active = $state(monitor?.active !== 0);

	let mode = $state<'ui' | 'code'>('ui');
	let script = $state<ScriptDSL>(getInitialScript());
	let code = $state(monitor?.script ?? scriptToJson(getDefaultScript()));
	let codeError = $state('');
	let isScriptValid = $state(true);

	let isSubmitting = $state(false);
	let error = $state('');

	let notificationChannels = $state<NotificationChannel[]>([]);
	let notifications = $state<MonitorNotificationInput[]>([]);

	onMount(async () => {
		try {
			const channelsRes = await fetch('/api/notification-channels');
			if (channelsRes.ok) {
				notificationChannels = await channelsRes.json();
			}

			if (monitor?.id) {
				const subsRes = await fetch(`/api/monitors/${monitor.id}/notifications`);
				if (subsRes.ok) {
					const subs = (await subsRes.json()) as Array<{
						channel_id: string;
						notify_on: string;
						downtime_threshold_s: number;
					}>;
					notifications = subs.map((s) => ({
						channelId: s.channel_id,
						notifyOn: s.notify_on.split(',').filter(Boolean) as ('up' | 'down' | 'degraded')[],
						downtimeThresholdSeconds: s.downtime_threshold_s
					}));
				}
			}
		} catch {
			// Ignore errors loading channels
		}
	});

	function switchToCode() {
		code = scriptToJson(script);
		codeError = '';
		mode = 'code';
	}

	function switchToUi() {
		if (codeError) {
			error = 'Cannot switch to UI mode: fix JSON errors first';
			return;
		}
		const parsed = jsonToScript(code);
		if (!parsed) {
			error = 'Cannot switch to UI mode: invalid script structure';
			return;
		}
		script = parsed;
		error = '';
		mode = 'ui';
	}

	function handleCodeValidChange(valid: boolean, parsedScript: ScriptDSL | null) {
		isScriptValid = valid;
		if (valid && parsedScript) {
			codeError = '';
		}
	}

	function handleUiValidChange(valid: boolean) {
		isScriptValid = valid;
	}

	function openClaudeHelp() {
		const prompt = `I need help creating a health check script for Pingflare monitoring. Please generate a JSON DSL script based on my requirements.

The DSL format is:
{
  "steps": [
    {
      "name": "step_name",
      "request": {
        "method": "GET|POST|PUT|DELETE|PATCH|HEAD",
        "url": "https://example.com/api",
        "headers": { "Authorization": "Bearer token" },
        "body": { "key": "value" }
      },
      "extract": { "varName": "json.path.to.value" },
      "assert": [
        { "check": "status", "equals": 200 },
        { "check": "json.field", "contains": "expected" }
      ]
    }
  ]
}

Available assertions:
- equals, notEquals: exact match
- contains, notContains: substring match
- matches: regex pattern
- greaterThan, lessThan, greaterOrEqual, lessOrEqual: numeric comparison
- exists: true/false for field existence
- hasKey: check if object has key
- hasLength, minLength, maxLength: array/string length

Path notation: status, body, json.field, json.array[0].field, headers.content-type

Variables: Extract with "extract": {"token": "json.access_token"}, use with \${token} in URLs/headers/body.

Requirement:
`;

		window.open(`https://claude.ai/new?q=${encodeURIComponent(prompt)}`, '_blank');
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';

		if (!name.trim()) {
			error = 'Name is required';
			return;
		}

		// Get the final script JSON
		let finalScript: string;
		if (mode === 'ui') {
			// Validate UI script
			if (script.steps.length === 0) {
				error = 'At least one step is required';
				return;
			}
			for (const step of script.steps) {
				if (!step.name) {
					error = 'All steps must have a name';
					return;
				}
				if (!step.request.url) {
					error = `Step "${step.name}" must have a URL`;
					return;
				}
			}
			finalScript = scriptToJson(script);
		} else {
			// Validate code
			if (codeError) {
				error = codeError;
				return;
			}
			finalScript = code;
		}

		isSubmitting = true;

		const formData = new FormData();
		formData.set('name', name.trim());
		formData.set('group_id', groupId);
		formData.set('script', finalScript);
		formData.set('interval_seconds', intervalSeconds);
		formData.set('timeout_ms', timeoutMs);
		formData.set('active', active ? '1' : '0');
		formData.set('notifications', JSON.stringify(notifications));

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

	let canSave = $derived(name.trim() && groupId && isScriptValid && !codeError);
</script>

<form onsubmit={handleSubmit} class="space-y-4">
	{#if error}
		<Alert variant="error" dismissible ondismiss={() => (error = '')}>{error}</Alert>
	{/if}

	<Input
		type="text"
		name="name"
		label="Monitor Name"
		placeholder="My API Health Check"
		bind:value={name}
		required
	/>

	<div>
		<label for="groupId" class="block text-sm font-medium text-gray-700">Group</label>
		<select
			id="groupId"
			bind:value={groupId}
			class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
			required
		>
			{#each groups as group}
				<option value={group.id}>{group.name}</option>
			{/each}
		</select>
		{#if groups.length === 0}
			<p class="mt-1 text-sm text-red-500">
				No groups available. <a href="/admin/groups" class="underline">Create a group first.</a>
			</p>
		{/if}
	</div>

	<div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
		<div class="mb-4 flex flex-wrap items-center justify-between gap-2">
			<div class="flex items-center gap-3">
				<span class="text-sm font-medium text-gray-700">Health Check Script</span>
				<button
					type="button"
					onclick={openClaudeHelp}
					class="inline-flex items-center gap-1 rounded-md bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700 hover:bg-orange-200 transition-colors"
				>
					<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
						<path
							d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"
						/>
					</svg>
					Ask Claude
				</button>
			</div>
			<div class="flex rounded-lg bg-gray-200 p-1">
				<button
					type="button"
					onclick={switchToUi}
					disabled={mode === 'ui'}
					class="rounded-md px-3 py-1 text-sm font-medium transition-colors {mode === 'ui'
						? 'bg-white text-gray-900 shadow-sm'
						: 'text-gray-600 hover:text-gray-900'} disabled:cursor-not-allowed"
				>
					Visual Builder
				</button>
				<button
					type="button"
					onclick={switchToCode}
					disabled={mode === 'code'}
					class="rounded-md px-3 py-1 text-sm font-medium transition-colors {mode === 'code'
						? 'bg-white text-gray-900 shadow-sm'
						: 'text-gray-600 hover:text-gray-900'} disabled:cursor-not-allowed"
				>
					Code
				</button>
			</div>
		</div>

		{#if mode === 'ui'}
			<ScriptBuilder bind:script onValidChange={handleUiValidChange} />
		{:else}
			<ScriptEditor bind:code bind:error={codeError} onValidChange={handleCodeValidChange} />
		{/if}
	</div>

	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
		<Input
			type="number"
			name="intervalSeconds"
			label="Check Interval (seconds)"
			bind:value={intervalSeconds}
			min={30}
			max={3600}
		/>
		<Input
			type="number"
			name="timeoutMs"
			label="Timeout (ms)"
			bind:value={timeoutMs}
			min={1000}
			max={60000}
		/>
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

	<div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
		<MonitorNotificationConfig
			channels={notificationChannels}
			value={notifications}
			onchange={(n) => (notifications = n)}
		/>
	</div>

	<div class="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
		<Button type="button" variant="secondary" onclick={onCancel}>Cancel</Button>
		<Button type="submit" loading={isSubmitting} disabled={!canSave}>
			{isSubmitting ? 'Saving...' : monitor ? 'Update Monitor' : 'Create Monitor'}
		</Button>
	</div>
</form>
