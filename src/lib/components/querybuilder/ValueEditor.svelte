<script lang="ts">
	import X from '@lucide/svelte/icons/x';
	import { paperById, searchAutocomplete } from '$lib/data';
	import { fieldById } from '$lib/query/fields';
	import { clampToViewport, clickOutside, listboxKeys } from '$lib/attachments';
	import PaperName from '../PaperName.svelte';
	import type { Condition } from '$lib/types';

	let {
		condition,
		onupdate
	}: {
		condition: Condition;
		onupdate: (condition: Condition) => void;
	} = $props();

	let spec = $derived(fieldById.get(condition.field));

	let numberRaw = $state('');

	let enumQuery = $state('');
	let addOpen = $state(false);
	let enumSearchEl: HTMLInputElement | undefined = $state();

	let relationQuery = $state('');
	let relationOpen = $state(false);

	let enumRoot: HTMLElement | undefined = $state();
	let relationRoot: HTMLElement | undefined = $state();

	let lastFieldKey = '';

	$effect(() => {
		const key = `${condition.field}|${condition.op}`;
		if (key === lastFieldKey) return;
		lastFieldKey = key;
		numberRaw = String(condition.values[0] ?? '');
		enumQuery = '';
		addOpen = false;
		relationQuery = '';
		relationOpen = false;
	});

	let selectedValue = $derived(condition.values[0] ?? undefined);
	let selectedId = $derived(selectedValue === undefined ? undefined : String(selectedValue));

	let enumOptions = $derived(spec?.kind === 'enum' ? spec.options() : []);
	let filteredEnumOptions = $derived.by(() => {
		const query = enumQuery.trim().toLowerCase();
		return enumOptions.filter(
			(o) => o.value !== selectedId && (!query || o.label.toLowerCase().includes(query))
		);
	});
	let relationCandidates = $derived.by(() =>
		searchAutocomplete(relationQuery, 8).filter((c) => c.id !== selectedId)
	);

	function focusRelationInput() {
		(relationRoot?.querySelector('input') as HTMLInputElement | null)?.focus();
	}

	function toggleAdd() {
		addOpen = !addOpen;
	}

	$effect(() => {
		if (addOpen && enumSearchEl) {
			queueMicrotask(() => enumSearchEl?.focus());
		}
	});

	function setValues(values: (string | number)[]) {
		onupdate({ ...condition, values });
	}

	function clearValues() {
		setValues([]);
	}

	function handleNumberInput(event: Event) {
		const raw = (event.currentTarget as HTMLInputElement).value;
		numberRaw = raw;
		const trimmed = raw.trim();
		if (!trimmed) {
			if (condition.values.length) setValues([]);
			return;
		}
		const n = Number(trimmed);
		if (Number.isNaN(n)) return;
		if (condition.values[0] !== n) setValues([n]);
	}

	function handleTextInput(event: Event) {
		const value = (event.currentTarget as HTMLInputElement).value;
		setValues(value ? [value] : []);
	}

	function chooseEnum(value: string) {
		setValues([value]);
		enumQuery = '';
		addOpen = false;
	}

	function handleRelationInput(event: Event) {
		relationQuery = (event.currentTarget as HTMLInputElement).value;
		relationOpen = true;
	}

	function selectRelation(id: string) {
		setValues([id]);
		relationQuery = '';
		relationOpen = false;
	}

	function handleRelationKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && relationCandidates.length > 0) {
			event.preventDefault();
			selectRelation(relationCandidates[0].id);
		} else if (event.key === 'Escape') {
			relationOpen = false;
		} else if (event.key === 'ArrowDown') {
			event.preventDefault();
			relationRoot?.querySelector<HTMLButtonElement>('button[role="option"]')?.focus();
		}
	}

	function handleRelationBlur(event: FocusEvent) {
		const target = event.relatedTarget as Node | null;
		if (target && relationRoot?.contains(target)) return;
		relationOpen = false;
	}

	function handleEnumBlur(event: FocusEvent) {
		const target = event.relatedTarget as Node | null;
		if (target && enumRoot?.contains(target)) return;
		addOpen = false;
	}

	const chipClass =
		'inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200';
</script>

{#if spec?.kind === 'number'}
	<input
		type="number"
		class="control w-36"
		value={numberRaw}
		oninput={handleNumberInput}
		aria-label="Numeric value"
		placeholder="Enter year"
	/>
{:else if spec?.kind === 'text'}
	<input
		type="text"
		class="control w-64 max-w-full"
		value={String(condition.values[0] ?? '')}
		oninput={handleTextInput}
		aria-label="Text value"
		placeholder="Enter text"
	/>
{:else if spec?.kind === 'enum'}
	<div
		class="relative flex flex-wrap items-center gap-1.5"
		role="presentation"
		bind:this={enumRoot}
		{@attach clickOutside(() => (addOpen = false))}
		{@attach listboxKeys({
			enabled: () => addOpen,
			onEscape: () => (addOpen = false),
			onLeaveUpwards: () => enumSearchEl?.focus()
		})}
		onblur={handleEnumBlur}
	>
		{#if selectedValue !== undefined}
			<span class={chipClass}>
				{String(selectedValue)}
				<button
					type="button"
					class="text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400"
					onclick={clearValues}
					aria-label={`Remove ${String(selectedValue)}`}
				>
					<X size={12} />
				</button>
			</span>
		{:else}
			<button
				type="button"
				class="h-9 rounded-md border border-gray-300 bg-white px-2.5 text-sm font-medium text-gray-700 hover:border-rust-600 hover:text-rust-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-rust-400 dark:hover:text-rust-300"
				onclick={toggleAdd}
				aria-expanded={addOpen}
				aria-haspopup="listbox"
				aria-label="Choose value"
			>
				+ Choose
			</button>
		{/if}
		{#if addOpen}
			<div
				class="dropdown-panel w-64 overflow-hidden"
				role="listbox"
				{@attach clampToViewport(() => addOpen)}
			>
				<input
					type="text"
					class="w-full border-b border-gray-200 px-3 py-2 text-sm placeholder:text-gray-400 dark:border-gray-700 dark:placeholder:text-gray-500"
					bind:value={enumQuery}
					bind:this={enumSearchEl}
					placeholder="Search options..."
					aria-label="Search options"
				/>
				<div class="max-h-48 overflow-y-auto py-1">
					{#each filteredEnumOptions as option (option.value)}
						<button
							type="button"
							role="option"
							class="dropdown-option flex items-center justify-between gap-2 focus-visible:bg-rust-50 focus-visible:text-rust-700 dark:focus-visible:bg-rust-950 dark:focus-visible:text-rust-300"
							aria-selected="false"
							onclick={() => chooseEnum(option.value)}
						>
							<span class="truncate">{option.label}</span>
							<span class="shrink-0 text-xs text-gray-500 dark:text-gray-400">{option.count}</span>
						</button>
					{:else}
						<p class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No matching options</p>
					{/each}
				</div>
			</div>
		{/if}
	</div>
{:else if spec?.kind === 'relation'}
	<div
		class="relative flex w-full min-w-0 items-center gap-1.5"
		role="presentation"
		bind:this={relationRoot}
		{@attach clickOutside(() => (relationOpen = false))}
		{@attach listboxKeys({
			enabled: () => relationOpen,
			onEscape: () => {
				relationOpen = false;
				focusRelationInput();
			},
			onLeaveUpwards: focusRelationInput
		})}
	>
		{#if selectedId !== undefined}
			{@const related = paperById.get(selectedId)}
			<div
				class="flex items-start gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 dark:border-gray-700 dark:bg-gray-800"
			>
				<PaperName
					entry={related}
					fallback={selectedId}
					class="text-sm leading-relaxed text-gray-800 dark:text-gray-200"
				/>
				<button
					type="button"
					class="h-6 w-6 shrink-0 rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600 dark:text-gray-500 dark:hover:bg-red-950 dark:hover:text-red-400"
					onclick={clearValues}
					aria-label="Remove value"
				>
					<X size={16} class="mx-auto" />
				</button>
			</div>
		{:else}
			<input
				type="text"
				class="control w-64 max-w-full"
				bind:value={relationQuery}
				onfocus={() => (relationOpen = true)}
				oninput={handleRelationInput}
				onblur={handleRelationBlur}
				onkeydown={handleRelationKeydown}
				placeholder="Search papers..."
				aria-label="Search papers to add"
			/>
		{/if}
		{#if relationOpen && relationQuery.trim()}
			<div
				class="dropdown-panel max-h-64 w-72 overflow-y-auto py-1"
				role="listbox"
				{@attach clampToViewport(() => relationOpen && relationQuery.trim() !== '')}
			>
				{#each relationCandidates as candidate (candidate.id)}
					<button
						type="button"
						role="option"
						class="dropdown-option leading-relaxed focus-visible:bg-rust-50 focus-visible:text-rust-700 dark:focus-visible:bg-rust-950 dark:focus-visible:text-rust-300"
						aria-selected="false"
						onmousedown={(e) => e.preventDefault()}
						onclick={() => selectRelation(candidate.id)}
					>
						<PaperName entry={candidate} class="block" />
					</button>
				{:else}
					<p class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No matching papers</p>
				{/each}
			</div>
		{/if}
	</div>
{/if}
