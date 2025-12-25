<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import type {
		ScriptDSL,
		ScriptStep,
		Assertion,
		HttpMethod,
		AssertionSeverity
	} from '$lib/types/script';
	import { createEmptyStep, createEmptyAssertion } from '$lib/types/script';

	let {
		script = $bindable(),
		onValidChange
	}: { script: ScriptDSL; onValidChange?: (valid: boolean) => void } = $props();

	const httpMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'];
	const assertionOperators = [
		{ value: 'equals', label: 'Equals' },
		{ value: 'notEquals', label: 'Not Equals' },
		{ value: 'contains', label: 'Contains' },
		{ value: 'notContains', label: 'Not Contains' },
		{ value: 'matches', label: 'Matches (Regex)' },
		{ value: 'greaterThan', label: 'Greater Than' },
		{ value: 'lessThan', label: 'Less Than' },
		{ value: 'exists', label: 'Exists' },
		{ value: 'hasKey', label: 'Has Key' },
		{ value: 'minLength', label: 'Min Length' },
		{ value: 'maxLength', label: 'Max Length' }
	];

	const severityOptions: { value: AssertionSeverity; label: string }[] = [
		{ value: 'degraded', label: 'Degraded' },
		{ value: 'down', label: 'Down' }
	];

	let expandedSteps = new SvelteSet([0]);

	function addStep() {
		const newStep = createEmptyStep(`step_${script.steps.length + 1}`);
		script.steps = [...script.steps, newStep];
		expandedSteps.add(script.steps.length - 1);
		validateScript();
	}

	function removeStep(index: number) {
		script.steps = script.steps.filter((_, i) => i !== index);
		expandedSteps.delete(index);
		validateScript();
	}

	function moveStep(index: number, direction: 'up' | 'down') {
		const newIndex = direction === 'up' ? index - 1 : index + 1;
		if (newIndex < 0 || newIndex >= script.steps.length) return;

		const newSteps = [...script.steps];
		[newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
		script.steps = newSteps;

		const wasExpanded = expandedSteps.has(index);
		const otherWasExpanded = expandedSteps.has(newIndex);
		if (wasExpanded) {
			expandedSteps.delete(index);
			expandedSteps.add(newIndex);
		}
		if (otherWasExpanded) {
			expandedSteps.delete(newIndex);
			expandedSteps.add(index);
		}
	}

	function toggleStep(index: number) {
		if (expandedSteps.has(index)) {
			expandedSteps.delete(index);
		} else {
			expandedSteps.add(index);
		}
	}

	function addHeader(step: ScriptStep) {
		if (!step.request.headers) {
			step.request.headers = {};
		}
		const key = `header_${Object.keys(step.request.headers).length + 1}`;
		step.request.headers[key] = '';
		script.steps = [...script.steps];
	}

	function removeHeader(step: ScriptStep, key: string) {
		if (step.request.headers) {
			delete step.request.headers[key];
			if (Object.keys(step.request.headers).length === 0) {
				step.request.headers = undefined;
			}
			script.steps = [...script.steps];
		}
	}

	function updateHeaderKey(step: ScriptStep, oldKey: string, newKey: string) {
		if (step.request.headers && oldKey !== newKey) {
			const value = step.request.headers[oldKey];
			delete step.request.headers[oldKey];
			step.request.headers[newKey] = value;
			script.steps = [...script.steps];
		}
	}

	function addExtract(step: ScriptStep) {
		if (!step.extract) {
			step.extract = {};
		}
		const key = `var_${Object.keys(step.extract).length + 1}`;
		step.extract[key] = 'json.';
		script.steps = [...script.steps];
	}

	function removeExtract(step: ScriptStep, key: string) {
		if (step.extract) {
			delete step.extract[key];
			if (Object.keys(step.extract).length === 0) {
				step.extract = undefined;
			}
			script.steps = [...script.steps];
		}
	}

	function updateExtractKey(step: ScriptStep, oldKey: string, newKey: string) {
		if (step.extract && oldKey !== newKey) {
			const value = step.extract[oldKey];
			delete step.extract[oldKey];
			step.extract[newKey] = value;
			script.steps = [...script.steps];
		}
	}

	function addAssertion(step: ScriptStep) {
		if (!step.assert) {
			step.assert = [];
		}
		step.assert = [...step.assert, createEmptyAssertion()];
		script.steps = [...script.steps];
	}

	function removeAssertion(step: ScriptStep, index: number) {
		if (step.assert) {
			step.assert = step.assert.filter((_, i) => i !== index);
			if (step.assert.length === 0) {
				step.assert = undefined;
			}
			script.steps = [...script.steps];
		}
	}

	function updateAssertionOperator(assertion: Assertion, operator: string) {
		const oldOperators = [
			'equals',
			'notEquals',
			'contains',
			'notContains',
			'matches',
			'greaterThan',
			'lessThan',
			'greaterOrEqual',
			'lessOrEqual',
			'exists',
			'hasKey',
			'hasLength',
			'minLength',
			'maxLength'
		];
		for (const op of oldOperators) {
			delete (assertion as unknown as Record<string, unknown>)[op];
		}

		if (operator === 'equals') assertion.equals = 200;
		else if (operator === 'notEquals') assertion.notEquals = '';
		else if (operator === 'contains') assertion.contains = '';
		else if (operator === 'notContains') assertion.notContains = '';
		else if (operator === 'matches') assertion.matches = '';
		else if (operator === 'greaterThan') assertion.greaterThan = 0;
		else if (operator === 'lessThan') assertion.lessThan = 0;
		else if (operator === 'exists') assertion.exists = true;
		else if (operator === 'hasKey') assertion.hasKey = '';
		else if (operator === 'minLength') assertion.minLength = 0;
		else if (operator === 'maxLength') assertion.maxLength = 0;

		script.steps = [...script.steps];
	}

	function getAssertionOperator(assertion: Assertion): string {
		if (assertion.equals !== undefined) return 'equals';
		if (assertion.notEquals !== undefined) return 'notEquals';
		if (assertion.contains !== undefined) return 'contains';
		if (assertion.notContains !== undefined) return 'notContains';
		if (assertion.matches !== undefined) return 'matches';
		if (assertion.greaterThan !== undefined) return 'greaterThan';
		if (assertion.lessThan !== undefined) return 'lessThan';
		if (assertion.exists !== undefined) return 'exists';
		if (assertion.hasKey !== undefined) return 'hasKey';
		if (assertion.minLength !== undefined) return 'minLength';
		if (assertion.maxLength !== undefined) return 'maxLength';
		return 'equals';
	}

	function getAssertionValue(assertion: Assertion): string {
		const op = getAssertionOperator(assertion);
		const value = (assertion as unknown as Record<string, unknown>)[op];
		if (typeof value === 'boolean') return value ? 'true' : 'false';
		return String(value ?? '');
	}

	function setAssertionValue(assertion: Assertion, value: string) {
		const op = getAssertionOperator(assertion);
		if (op === 'exists') {
			assertion.exists = value === 'true';
		} else if (['greaterThan', 'lessThan', 'minLength', 'maxLength'].includes(op)) {
			(assertion as unknown as Record<string, unknown>)[op] = parseInt(value, 10) || 0;
		} else if (op === 'equals') {
			const numVal = parseInt(value, 10);
			(assertion as unknown as Record<string, unknown>)[op] = isNaN(numVal) ? value : numVal;
		} else {
			(assertion as unknown as Record<string, unknown>)[op] = value;
		}
		script.steps = [...script.steps];
	}

	function validateScript() {
		const valid =
			script.steps.length > 0 &&
			script.steps.every((step) => step.name && step.request.url && step.request.method);
		onValidChange?.(valid);
	}

	$effect(() => {
		validateScript();
	});
</script>

<div class="space-y-4">
	{#each script.steps as step, index (index)}
		<div class="rounded-lg border border-gray-200 bg-white">
			<div
				class="flex cursor-pointer items-center justify-between p-3 hover:bg-gray-50"
				onclick={() => toggleStep(index)}
				onkeydown={(e) => e.key === 'Enter' && toggleStep(index)}
				role="button"
				tabindex="0"
			>
				<div class="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
					<span
						class="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-gray-100 text-xs font-medium text-gray-600"
					>
						{index + 1}
					</span>
					<span class="truncate font-medium text-gray-900">{step.name || 'Unnamed Step'}</span>
					<span class="shrink-0 rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
						{step.request.method}
					</span>
					{#if step.request.url}
						<span class="hidden truncate text-sm text-gray-500 sm:block">{step.request.url}</span>
					{/if}
				</div>
				<div class="flex items-center gap-1">
					{#if index > 0}
						<button
							type="button"
							onclick={(e) => {
								e.stopPropagation();
								moveStep(index, 'up');
							}}
							class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
							title="Move up"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 15l7-7 7 7"
								/>
							</svg>
						</button>
					{/if}
					{#if index < script.steps.length - 1}
						<button
							type="button"
							onclick={(e) => {
								e.stopPropagation();
								moveStep(index, 'down');
							}}
							class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
							title="Move down"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M19 9l-7 7-7-7"
								/>
							</svg>
						</button>
					{/if}
					<button
						type="button"
						onclick={(e) => {
							e.stopPropagation();
							removeStep(index);
						}}
						class="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
						title="Remove step"
						disabled={script.steps.length === 1}
					>
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
							/>
						</svg>
					</button>
					<svg
						class="h-5 w-5 text-gray-400 transition-transform {expandedSteps.has(index)
							? 'rotate-180'
							: ''}"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M19 9l-7 7-7-7"
						/>
					</svg>
				</div>
			</div>

			{#if expandedSteps.has(index)}
				<div class="border-t border-gray-200 p-4 space-y-4">
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div>
							<label class="block text-sm font-medium text-gray-700">Step Name</label>
							<input
								type="text"
								bind:value={step.name}
								class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
								placeholder="e.g., login, get_data"
							/>
						</div>
						<div>
							<label class="block text-sm font-medium text-gray-700">Method</label>
							<select
								bind:value={step.request.method}
								class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
							>
								{#each httpMethods as method (method)}
									<option value={method}>{method}</option>
								{/each}
							</select>
						</div>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700">URL</label>
						<input
							type="text"
							bind:value={step.request.url}
							class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
							placeholder={`https://api.example.com/endpoint or use \${variable}`}
						/>
					</div>

					<div>
						<div class="flex items-center justify-between">
							<label class="block text-sm font-medium text-gray-700">Headers</label>
							<button
								type="button"
								onclick={() => addHeader(step)}
								class="text-sm text-blue-600 hover:text-blue-700"
							>
								+ Add Header
							</button>
						</div>
						{#if step.request.headers && Object.keys(step.request.headers).length > 0}
							<div class="mt-2 space-y-2">
								{#each Object.entries(step.request.headers) as [key, value] (key)}
									<div class="flex flex-col gap-2 sm:flex-row">
										<input
											type="text"
											value={key}
											onchange={(e) =>
												updateHeaderKey(step, key, (e.target as HTMLInputElement).value)}
											class="block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none sm:w-1/3"
											placeholder="Header name"
										/>
										<div class="flex flex-1 gap-2">
											<input
												type="text"
												{value}
												oninput={(e) => {
													step.request.headers![key] = (e.target as HTMLInputElement).value;
													script.steps = [...script.steps];
												}}
												class="block flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-mono shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
												placeholder={`Value (use \${var} for variables)`}
											/>
											<button
												type="button"
												onclick={() => removeHeader(step, key)}
												class="shrink-0 rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
												aria-label="Remove header"
											>
												<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M6 18L18 6M6 6l12 12"
													/>
												</svg>
											</button>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>

					{#if ['POST', 'PUT', 'PATCH'].includes(step.request.method)}
						<div>
							<label class="block text-sm font-medium text-gray-700">Request Body (JSON)</label>
							<textarea
								value={step.request.body ? JSON.stringify(step.request.body, null, 2) : ''}
								oninput={(e) => {
									try {
										step.request.body = JSON.parse((e.target as HTMLTextAreaElement).value);
									} catch {
										step.request.body = (e.target as HTMLTextAreaElement).value;
									}
									script.steps = [...script.steps];
								}}
								rows="4"
								class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
								placeholder={`{"key": "value"}`}
							></textarea>
						</div>
					{/if}

					<div>
						<div class="flex items-center justify-between">
							<label class="block text-sm font-medium text-gray-700">Extract Variables</label>
							<button
								type="button"
								onclick={() => addExtract(step)}
								class="text-sm text-blue-600 hover:text-blue-700"
							>
								+ Add Variable
							</button>
						</div>
						<p class="text-xs text-gray-500 mt-1">
							Extract values from response to use in later steps
						</p>
						{#if step.extract && Object.keys(step.extract).length > 0}
							<div class="mt-2 space-y-2">
								{#each Object.entries(step.extract) as [varName, path] (varName)}
									<div class="flex flex-col gap-2 sm:flex-row">
										<input
											type="text"
											value={varName}
											onchange={(e) =>
												updateExtractKey(step, varName, (e.target as HTMLInputElement).value)}
											class="block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none sm:w-1/3"
											placeholder="Variable name"
										/>
										<div class="flex flex-1 gap-2">
											<input
												type="text"
												value={path}
												oninput={(e) => {
													step.extract![varName] = (e.target as HTMLInputElement).value;
													script.steps = [...script.steps];
												}}
												class="block flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-mono shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
												placeholder="json.data.token"
											/>
											<button
												type="button"
												onclick={() => removeExtract(step, varName)}
												class="shrink-0 rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
												aria-label="Remove variable"
											>
												<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M6 18L18 6M6 6l12 12"
													/>
												</svg>
											</button>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>

					<div>
						<div class="flex items-center justify-between">
							<label class="block text-sm font-medium text-gray-700">Assertions</label>
							<button
								type="button"
								onclick={() => addAssertion(step)}
								class="text-sm text-blue-600 hover:text-blue-700"
							>
								+ Add Assertion
							</button>
						</div>
						<p class="text-xs text-gray-500 mt-1">
							Validate response values (status, responseTime, json.*, body, headers.*)
						</p>
						{#if step.assert && step.assert.length > 0}
							<div class="mt-2 space-y-3">
								{#each step.assert as assertion, assertIndex (assertIndex)}
									<div class="rounded-lg border border-gray-100 bg-gray-50 p-3">
										<div class="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2">
											<input
												type="text"
												bind:value={assertion.check}
												class="col-span-2 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm font-mono shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none sm:w-1/5"
												placeholder="status, responseTime"
											/>
											<select
												value={getAssertionOperator(assertion)}
												onchange={(e) =>
													updateAssertionOperator(assertion, (e.target as HTMLSelectElement).value)}
												class="block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none sm:w-1/5"
											>
												{#each assertionOperators as op (op.value)}
													<option value={op.value}>{op.label}</option>
												{/each}
											</select>
											{#if getAssertionOperator(assertion) !== 'exists'}
												<input
													type="text"
													value={getAssertionValue(assertion)}
													oninput={(e) =>
														setAssertionValue(assertion, (e.target as HTMLInputElement).value)}
													class="block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm font-mono shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none sm:flex-1"
													placeholder="Expected value"
												/>
											{:else}
												<select
													value={getAssertionValue(assertion)}
													onchange={(e) =>
														setAssertionValue(assertion, (e.target as HTMLSelectElement).value)}
													class="block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none sm:flex-1"
												>
													<option value="true">Should Exist</option>
													<option value="false">Should Not Exist</option>
												</select>
											{/if}
											<select
												value={assertion.severity ?? 'degraded'}
												onchange={(e) => {
													assertion.severity = (e.target as HTMLSelectElement)
														.value as AssertionSeverity;
													script.steps = [...script.steps];
												}}
												class="block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none sm:w-32"
												title="Failure severity"
											>
												{#each severityOptions as sev (sev.value)}
													<option value={sev.value}>{sev.label}</option>
												{/each}
											</select>
											<button
												type="button"
												onclick={() => removeAssertion(step, assertIndex)}
												class="justify-self-end rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 sm:shrink-0"
												aria-label="Remove assertion"
											>
												<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M6 18L18 6M6 6l12 12"
													/>
												</svg>
											</button>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	{/each}

	<button
		type="button"
		onclick={addStep}
		class="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 p-4 text-gray-500 hover:border-blue-400 hover:text-blue-600"
	>
		<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
		</svg>
		Add Step
	</button>
</div>
