<script lang="ts">
	import { FIELDS, fieldById } from '$lib/query/fields';
	import type { Condition, ConditionOp } from '$lib/types';
	import ValueEditor from './ValueEditor.svelte';

	let {
		condition,
		onupdate,
		invalid = false
	}: {
		condition: Condition;
		onupdate: (condition: Condition) => void;
		invalid?: boolean;
	} = $props();

	let field = $derived(fieldById.get(condition.field));

	function changeField(fieldId: string) {
		const spec = fieldById.get(fieldId);
		if (!spec) return;
		const op: ConditionOp = spec.operators.some((o) => o.id === condition.op)
			? condition.op
			: spec.operators[0].id;
		onupdate({ ...condition, field: fieldId, op, values: [] });
	}

	function changeOp(op: ConditionOp) {
		onupdate({ ...condition, op });
	}
</script>

<div class="flex flex-wrap items-center gap-2">
	<select
		class="control"
		value={condition.field}
		onchange={(e) => changeField(e.currentTarget.value)}
		aria-label="Condition field"
	>
		{#each FIELDS as f (f.id)}
			<option value={f.id}>{f.label}</option>
		{/each}
	</select>
	{#if field}
		{#if field.operators.length === 1}
			<span
				class="inline-flex h-9 items-center rounded-md border border-gray-200 bg-gray-50 px-2 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
			>
				{field.operators[0].label}
			</span>
		{:else}
			<select
				class="control"
				value={condition.op}
				onchange={(e) => changeOp(e.currentTarget.value as ConditionOp)}
				aria-label="Condition operator"
			>
				{#each field.operators as op (op.id)}
					<option value={op.id}>{op.label}</option>
				{/each}
			</select>
		{/if}
	{/if}
	<ValueEditor {condition} {onupdate} />
	{#if invalid}
		<span class="text-xs font-medium text-red-600 dark:text-red-400">Missing value</span>
	{/if}
</div>
