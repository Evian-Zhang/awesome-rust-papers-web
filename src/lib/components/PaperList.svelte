<script lang="ts">
	import { searchState, type SortOrder } from '$lib/searchState.svelte';
	import PaperCard from './PaperCard.svelte';

	const BASE_SORT_OPTIONS: { value: SortOrder; label: string }[] = [
		{ value: 'yearDesc', label: 'Year (newest)' },
		{ value: 'yearAsc', label: 'Year (oldest)' },
		{ value: 'titleAsc', label: 'Title' },
		{ value: 'referencedByDesc', label: 'Referenced by' }
	];

	const sortOptions = $derived(
		searchState.searchQuery.trim() !== ''
			? [{ value: 'relevance' as SortOrder, label: 'Relevance' }, ...BASE_SORT_OPTIONS]
			: BASE_SORT_OPTIONS
	);
</script>

<section>
	<div class="mb-3 flex items-center justify-between gap-2">
		<div class="flex items-baseline gap-3 text-sm text-gray-500 dark:text-gray-400">
			<span aria-live="polite">
				<span class="font-semibold text-gray-900 tabular-nums dark:text-gray-100">
					{searchState.filteredResults.length}
				</span>
				papers
			</span>
			{#if searchState.hasActiveFilters}
				<button
					type="button"
					onclick={() => searchState.clearAll()}
					class="text-xs text-rust-700 underline-offset-2 hover:underline dark:text-rust-400"
				>
					Clear all
				</button>
			{/if}
		</div>
		<label class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
			<span>Sort</span>
			<select
				bind:value={searchState.sortOrder}
				class="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
			>
				{#each sortOptions as option (option.value)}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		</label>
	</div>

	{#if searchState.filteredResults.length === 0}
		<div class="flex flex-col items-center gap-3 py-12 text-center">
			<p class="text-sm text-gray-500 dark:text-gray-400">No papers match your search.</p>
			<button
				type="button"
				onclick={() => searchState.clearAll()}
				class="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
			>
				Clear all
			</button>
		</div>
	{:else}
		<div class="space-y-3">
			{#each searchState.filteredResults as { paper } (paper.id)}
				<PaperCard {paper} />
			{/each}
		</div>
	{/if}
</section>
