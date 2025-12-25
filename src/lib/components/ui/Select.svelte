<script lang="ts">
	interface Option {
		value: string;
		label: string;
	}

	let {
		name,
		label = undefined,
		value = $bindable(''),
		options,
		error = undefined,
		disabled = false,
		required = false,
		class: className = ''
	}: {
		name: string;
		label?: string;
		value?: string;
		options: Option[];
		error?: string;
		disabled?: boolean;
		required?: boolean;
		class?: string;
	} = $props();

	const selectStyles = $derived(
		`w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-gray-50 disabled:cursor-not-allowed appearance-none bg-white bg-no-repeat ${
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

	<div class="relative">
		<select
			{name}
			id={name}
			bind:value
			{disabled}
			{required}
			class={selectStyles}
			aria-invalid={!!error}
			aria-describedby={error ? `${name}-error` : undefined}
		>
			{#each options as option (option.value)}
				<option value={option.value}>{option.label}</option>
			{/each}
		</select>
		<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
			<svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"
				></path>
			</svg>
		</div>
	</div>

	{#if error}
		<p id="{name}-error" class="text-sm text-red-600">{error}</p>
	{/if}
</div>
