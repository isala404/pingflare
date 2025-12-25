<script lang="ts">
	let {
		name,
		label = undefined,
		value = $bindable(''),
		rows = 4,
		placeholder = '',
		error = undefined,
		disabled = false,
		required = false,
		monospace = false,
		class: className = ''
	}: {
		name: string;
		label?: string;
		value?: string;
		rows?: number;
		placeholder?: string;
		error?: string;
		disabled?: boolean;
		required?: boolean;
		monospace?: boolean;
		class?: string;
	} = $props();

	const textareaStyles = $derived(
		`w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-gray-50 disabled:cursor-not-allowed resize-y ${
			monospace ? 'font-mono' : ''
		} ${
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

	<textarea
		{name}
		id={name}
		{rows}
		{placeholder}
		bind:value
		{disabled}
		{required}
		class={textareaStyles}
		aria-invalid={!!error}
		aria-describedby={error ? `${name}-error` : undefined}
	></textarea>

	{#if error}
		<p id="{name}-error" class="text-sm text-red-600">{error}</p>
	{/if}
</div>
