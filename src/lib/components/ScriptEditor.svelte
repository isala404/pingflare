<script lang="ts">
	import type { ScriptDSL } from '$lib/types/script';

	let {
		code = $bindable(),
		error = $bindable(''),
		onValidChange
	}: {
		code: string;
		error: string;
		onValidChange?: (valid: boolean, script: ScriptDSL | null) => void;
	} = $props();

	function validateCode(value: string): {
		valid: boolean;
		error: string;
		script: ScriptDSL | null;
	} {
		if (!value.trim()) {
			return { valid: false, error: 'Script cannot be empty', script: null };
		}

		try {
			const parsed = JSON.parse(value);

			if (!parsed.steps || !Array.isArray(parsed.steps)) {
				return { valid: false, error: 'Script must have a "steps" array', script: null };
			}

			if (parsed.steps.length === 0) {
				return { valid: false, error: 'Script must have at least one step', script: null };
			}

			for (let i = 0; i < parsed.steps.length; i++) {
				const step = parsed.steps[i];
				if (!step.name) {
					return { valid: false, error: `Step ${i + 1} must have a "name"`, script: null };
				}
				if (!step.request?.url) {
					return {
						valid: false,
						error: `Step "${step.name}" must have a request URL`,
						script: null
					};
				}
				if (!step.request?.method) {
					return {
						valid: false,
						error: `Step "${step.name}" must have a request method`,
						script: null
					};
				}
			}

			return { valid: true, error: '', script: parsed as ScriptDSL };
		} catch (e) {
			const message = e instanceof Error ? e.message : 'Invalid JSON';
			return { valid: false, error: `JSON Error: ${message}`, script: null };
		}
	}

	function handleInput(e: Event) {
		const target = e.target as HTMLTextAreaElement;
		code = target.value;
		const result = validateCode(code);
		error = result.error;
		onValidChange?.(result.valid, result.script);
	}

	function formatCode() {
		try {
			const parsed = JSON.parse(code);
			code = JSON.stringify(parsed, null, 2);
			const result = validateCode(code);
			error = result.error;
			onValidChange?.(result.valid, result.script);
		} catch {
			// Keep code as-is if it's not valid JSON
		}
	}

	$effect(() => {
		const result = validateCode(code);
		error = result.error;
		onValidChange?.(result.valid, result.script);
	});
</script>

<div class="space-y-2">
	<div class="flex items-center justify-between">
		<label class="block text-sm font-medium text-gray-700">Script (JSON DSL)</label>
		<button type="button" onclick={formatCode} class="text-sm text-blue-600 hover:text-blue-700">
			Format JSON
		</button>
	</div>

	<textarea
		value={code}
		oninput={handleInput}
		rows="20"
		class="block w-full rounded-md border px-3 py-2 font-mono text-sm shadow-sm focus:ring-1 focus:outline-none {error
			? 'border-red-300 focus:border-red-500 focus:ring-red-500'
			: 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}"
		placeholder={`{"steps": [...]}`}
		spellcheck="false"
	></textarea>

	{#if error}
		<div class="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
			<svg
				class="h-5 w-5 flex-shrink-0 text-red-400"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
				/>
			</svg>
			<span>{error}</span>
		</div>
	{:else}
		<div class="flex items-start gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700">
			<svg
				class="h-5 w-5 flex-shrink-0 text-green-400"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
			</svg>
			<span>Valid script</span>
		</div>
	{/if}

	<details class="text-sm text-gray-600">
		<summary class="cursor-pointer hover:text-gray-900">DSL Reference</summary>
		<div class="mt-2 rounded-md bg-gray-50 p-3 space-y-2 text-xs">
			<p>
				<strong>Path notation:</strong> <code class="bg-gray-200 px-1">status</code>,
				<code class="bg-gray-200 px-1">json.user.name</code>,
				<code class="bg-gray-200 px-1">json.items[0].id</code>,
				<code class="bg-gray-200 px-1">headers.content-type</code>
			</p>
			<p>
				<strong>Variables:</strong> Use <code class="bg-gray-200 px-1">{'${varName}'}</code> in URLs,
				headers, and body
			</p>
			<p>
				<strong>Assertions:</strong> equals, notEquals, contains, matches (regex), greaterThan, lessThan,
				exists, hasKey, minLength, maxLength
			</p>
		</div>
	</details>
</div>
