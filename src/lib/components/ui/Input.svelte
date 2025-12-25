<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	type InputType = 'text' | 'email' | 'password' | 'number' | 'url';

	let {
		type = 'text',
		name,
		label = undefined,
		placeholder = '',
		value = $bindable(''),
		error = undefined,
		helper = undefined,
		disabled = false,
		required = false,
		min = undefined,
		max = undefined,
		step = undefined,
		autocomplete = undefined,
		class: className = ''
	}: {
		type?: InputType;
		name: string;
		label?: string;
		placeholder?: string;
		value?: string | number;
		error?: string;
		helper?: string;
		disabled?: boolean;
		required?: boolean;
		min?: number;
		max?: number;
		step?: number;
		autocomplete?: HTMLInputAttributes['autocomplete'];
		class?: string;
	} = $props();

	const inputStyles = $derived(
		`w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-gray-50 disabled:cursor-not-allowed ${
			error
				? 'border-red-300 focus:border-red-500 focus:ring-red-200'
				: 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
		} ${className}`
	);
</script>

<div class="space-y-1">
	{#if label}
		<label for={name} class="block text-sm font-medium text-gray-700">
			{label}
			{#if required}
				<span class="text-red-500">*</span>
			{/if}
		</label>
	{/if}

	<input
		{type}
		{name}
		id={name}
		{placeholder}
		bind:value
		{disabled}
		{required}
		{min}
		{max}
		{step}
		{autocomplete}
		class={inputStyles}
		aria-invalid={!!error}
		aria-describedby={error ? `${name}-error` : helper ? `${name}-helper` : undefined}
	/>

	{#if error}
		<p id="{name}-error" class="text-sm text-red-600">{error}</p>
	{:else if helper}
		<p id="{name}-helper" class="text-sm text-gray-500">{helper}</p>
	{/if}
</div>
