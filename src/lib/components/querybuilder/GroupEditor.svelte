<script module lang="ts">
	import X from '@lucide/svelte/icons/x';
	let condSeq = 0;
	let groupSeq = 0;

	function nextConditionId() {
		return `cond-${++condSeq}`;
	}

	function nextGroupId() {
		return `group-${++groupSeq}`;
	}
</script>

<script lang="ts">
	import { FIELDS, fieldById } from '$lib/query/fields';
	import { clickOutside, listboxKeys } from '$lib/attachments';
	import type { Condition, ConditionGroup, GroupItem } from '$lib/types';
	import ConditionRow from './ConditionRow.svelte';
	import GroupEditor from './GroupEditor.svelte';

	let {
		group,
		onupdate,
		invalidIds,
		depth = 0
	}: {
		group: ConditionGroup;
		onupdate: (group: ConditionGroup) => void;
		invalidIds: Set<string>;
		depth?: number;
	} = $props();

	let fieldMenuOpen = $state(false);
	let confirmingId = $state<string | null>(null);

	let fieldMenuRoot: HTMLElement | undefined = $state();
	let fieldTriggerEl: HTMLButtonElement | undefined = $state();

	function replaceItem(id: string, item: GroupItem) {
		onupdate({ ...group, items: group.items.map((it) => (it.id === id ? item : it)) });
	}

	function removeItem(id: string) {
		onupdate({ ...group, items: group.items.filter((it) => it.id !== id) });
		confirmingId = null;
	}

	function requestRemove(item: GroupItem) {
		if ('items' in item.node && item.node.items.length > 0) {
			confirmingId = item.id;
		} else {
			removeItem(item.id);
		}
	}

	function toggleFieldMenu() {
		fieldMenuOpen = !fieldMenuOpen;
		if (fieldMenuOpen) {
			queueMicrotask(() =>
				fieldMenuRoot?.querySelector<HTMLButtonElement>('button[role="option"]')?.focus()
			);
		}
	}

	function addCondition(fieldId: string) {
		const spec = fieldById.get(fieldId);
		if (!spec) return;
		const condition: Condition = {
			id: nextConditionId(),
			field: fieldId,
			op: spec.operators[0].id,
			values: []
		};
		const item: GroupItem = {
			id: nextConditionId() + '-item',
			connector: 'AND',
			not: false,
			node: condition
		};
		onupdate({ ...group, items: [...group.items, item] });
		fieldMenuOpen = false;
	}

	function addGroupItem() {
		const child: ConditionGroup = {
			id: nextGroupId(),
			items: []
		};
		const item: GroupItem = {
			id: nextGroupId() + '-item',
			connector: 'AND',
			not: false,
			node: child
		};
		onupdate({ ...group, items: [...group.items, item] });
	}
</script>

<div
	class={depth > 0
		? 'space-y-2 rounded-r-md border-l-2 border-gray-200 bg-gray-50/60 p-2 pl-3 transition-colors hover:border-l-rust-400 dark:border-gray-800 dark:bg-gray-800/40 dark:hover:border-l-rust-400'
		: 'space-y-2'}
	role="group"
	aria-label={depth > 0 ? 'Nested condition group' : 'Query conditions'}
>
	{#if group.items.length === 0}
		<p class="py-1 text-sm text-gray-500 dark:text-gray-400">No conditions. Add one below.</p>
	{:else}
		<ul class="space-y-2">
			{#each group.items as item, index (item.id)}
				<li
					class="flex flex-wrap items-start gap-2 {'items' in item.node
						? ''
						: invalidIds.has(item.node.id)
							? 'rounded-md border border-red-300 bg-red-50/40 p-1.5 dark:border-red-900 dark:bg-red-950/30'
							: ''}"
				>
					{#if index > 0}
						<select
							class="control w-20"
							value={item.connector}
							onchange={(e) =>
								replaceItem(item.id, {
									...item,
									connector: e.currentTarget.value as GroupItem['connector']
								})}
							aria-label="Combine with previous"
						>
							<option value="AND">AND</option>
							<option value="OR">OR</option>
						</select>
					{:else}
						<span class="inline-block w-20 shrink-0" aria-hidden="true"></span>
					{/if}
					<button
						type="button"
						class="h-9 w-14 shrink-0 rounded-md border text-xs font-semibold transition-colors {item.not
							? 'border-red-600 bg-red-50 text-red-700 dark:border-red-500 dark:bg-red-950/40 dark:text-red-400'
							: 'border-dashed border-gray-300 bg-transparent text-gray-400 hover:border-gray-400 hover:text-gray-500 dark:border-gray-700 dark:text-gray-500 dark:hover:border-gray-500 dark:hover:text-gray-400'}"
						onclick={() => replaceItem(item.id, { ...item, not: !item.not })}
						aria-pressed={item.not}
						aria-label="Negate this row"
						title={item.not ? 'Remove negation' : 'Negate this condition'}
					>
						NOT
					</button>
					<div class="min-w-0 flex-1">
						{#if 'items' in item.node}
							<GroupEditor
								group={item.node}
								onupdate={(g) => replaceItem(item.id, { ...item, node: g })}
								{invalidIds}
								depth={depth + 1}
							/>
						{:else}
							<ConditionRow
								condition={item.node}
								onupdate={(c) => replaceItem(item.id, { ...item, node: c })}
								invalid={invalidIds.has(item.node.id)}
							/>
						{/if}
					</div>
					{#if confirmingId === item.id}
						<span
							class="flex shrink-0 items-center gap-1 rounded-md border border-red-200 bg-red-50 p-1 dark:border-red-900 dark:bg-red-950/40"
							role="alert"
						>
							<span class="px-1 text-xs font-medium text-red-700 dark:text-red-400"
								>Delete group?</span
							>
							<button
								type="button"
								class="rounded bg-red-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
								onclick={() => removeItem(item.id)}
							>
								Delete
							</button>
							<button
								type="button"
								class="rounded border border-gray-300 bg-white px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
								onclick={() => (confirmingId = null)}
							>
								Cancel
							</button>
						</span>
					{:else}
						<button
							type="button"
							class="h-9 w-9 shrink-0 rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600 dark:text-gray-500 dark:hover:bg-red-950 dark:hover:text-red-400"
							onclick={() => requestRemove(item)}
							aria-label={'items' in item.node ? 'Delete group' : 'Delete condition'}
						>
							<X size={16} class="mx-auto" />
						</button>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}

	<div class="flex items-center gap-2">
		<div
			class="relative inline-block"
			bind:this={fieldMenuRoot}
			{@attach clickOutside(() => (fieldMenuOpen = false))}
			{@attach listboxKeys({
				enabled: () => fieldMenuOpen,
				onEscape: () => {
					fieldMenuOpen = false;
					fieldTriggerEl?.focus();
				}
			})}
		>
			<button
				type="button"
				class="h-9 rounded-md border border-dashed border-gray-300 bg-transparent px-3 text-sm text-gray-600 hover:border-rust-600 hover:text-rust-700 dark:border-gray-700 dark:text-gray-400 dark:hover:border-rust-400 dark:hover:text-rust-300"
				onclick={toggleFieldMenu}
				aria-expanded={fieldMenuOpen}
				aria-haspopup="listbox"
				bind:this={fieldTriggerEl}
			>
				+ Condition
			</button>
			{#if fieldMenuOpen}
				<div
					class="dropdown-panel max-h-64 w-56 overflow-y-auto py-1"
					role="listbox"
					aria-label="Add condition"
					tabindex="-1"
				>
					{#each FIELDS as field (field.id)}
						<button
							type="button"
							role="option"
							class="dropdown-option"
							aria-selected="false"
							onclick={() => addCondition(field.id)}
						>
							{field.label}
						</button>
					{/each}
				</div>
			{/if}
		</div>
		<button
			type="button"
			class="h-9 rounded-md border border-dashed border-gray-300 bg-transparent px-3 text-sm text-gray-600 hover:border-rust-600 hover:text-rust-700 dark:border-gray-700 dark:text-gray-400 dark:hover:border-rust-400 dark:hover:text-rust-300"
			onclick={addGroupItem}
		>
			+ Group
		</button>
	</div>
</div>
