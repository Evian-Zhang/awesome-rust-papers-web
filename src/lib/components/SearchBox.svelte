<script lang="ts">
	import Search from 'lucide-svelte/icons/search';
	import X from 'lucide-svelte/icons/x';
	import { searchState } from '$lib/searchState.svelte';
	import { serializeQuery } from '$lib/query/serialize';
	import type { Snippet } from 'svelte';

	let { advanced }: { advanced?: Snippet } = $props();

	let advancedOpen = $state(false);
	let serialized = $derived(serializeQuery(searchState.draftQueryTree));
	let dirty = $derived(
		searchState.draftSearchQuery.trim() !== searchState.searchQuery.trim() ||
			serializeQuery(searchState.draftQueryTree) !== serializeQuery(searchState.queryTree)
	);
	let searchFailed = $state(false);
	let failedTimer: ReturnType<typeof setTimeout> | undefined;

	function runSearch() {
		if (!searchState.applySearch()) {
			advancedOpen = true;
			searchFailed = true;
			clearTimeout(failedTimer);
			failedTimer = setTimeout(() => (searchFailed = false), 1600);
		}
	}
</script>

<div
	class="rounded-lg bg-gray-100 p-1.5 transition-shadow focus-within:bg-white focus-within:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_2px_6px_2px_rgba(0,0,0,0.15)] dark:bg-gray-900 dark:focus-within:bg-gray-800"
>
	<div class="flex items-center gap-2 px-2">
		<div
			role="tablist"
			aria-label="Search mode"
			class="flex shrink-0 items-center gap-0.5 rounded-md bg-gray-200/70 p-0.5 dark:bg-gray-800"
		>
			<button
				type="button"
				role="tab"
				aria-selected={!advancedOpen}
				onclick={() => (advancedOpen = false)}
				class="rounded px-3 py-1 text-sm {!advancedOpen
					? 'bg-white font-medium text-rust-700 shadow-sm dark:bg-gray-700 dark:text-rust-400'
					: 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'}"
			>
				Text search
			</button>
			<button
				type="button"
				role="tab"
				aria-selected={advancedOpen}
				onclick={() => (advancedOpen = true)}
				class="rounded px-3 py-1 text-sm {advancedOpen
					? 'bg-white font-medium text-rust-700 shadow-sm dark:bg-gray-700 dark:text-rust-400'
					: 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'}"
			>
				Advanced
			</button>
		</div>
		{#if !advancedOpen}
			<Search size={20} class="shrink-0 text-gray-400 dark:text-gray-500" />
			<input
				type="text"
				class="h-9 w-full min-w-0 bg-transparent text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500"
				placeholder="Search papers..."
				bind:value={searchState.draftSearchQuery}
				onkeydown={(e) => {
					if (e.key === 'Enter') runSearch();
				}}
				aria-label="Search papers"
			/>
			{#if searchState.draftSearchQuery}
				<button
					type="button"
					class="rounded-full p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
					onclick={() => searchState.clearSearch()}
					aria-label="Clear search"
				>
					<X size={16} />
				</button>
			{/if}
		{:else}
			<span
				class="w-full min-w-0 truncate text-sm leading-relaxed {serialized
					? 'text-gray-700 dark:text-gray-300'
					: 'text-gray-500 dark:text-gray-400'}"
				title={serialized}
			>
				{serialized || 'No conditions yet'}
			</span>
			{#if searchState.searchQuery.trim()}
				<button
					type="button"
					class="flex h-7 max-w-56 shrink-0 items-center gap-1 rounded-full border border-gray-300 bg-white px-2 text-xs text-gray-700 hover:border-rust-600 hover:text-rust-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-rust-400 dark:hover:text-rust-300"
					onclick={() => searchState.clearSearch()}
					title="Remove text search"
					aria-label="Remove text search"
				>
					<span class="truncate">"{searchState.searchQuery.trim()}"</span>
					<X size={12} class="shrink-0" />
				</button>
			{/if}
		{/if}
		<button
			type="button"
			class="h-9 shrink-0 rounded-md bg-rust-600 px-4 text-sm font-medium text-white hover:bg-rust-700 dark:bg-rust-500 dark:hover:bg-rust-600 {searchFailed
				? 'shake ring-2 ring-red-400'
				: ''}"
			onclick={runSearch}
			title={dirty ? 'Unapplied changes — press Search to apply' : 'Apply search'}
		>
			Search
			{#if dirty}
				<span class="ml-1.5 inline-block h-2 w-2 rounded-full bg-white/90" aria-hidden="true"
				></span>
			{/if}
		</button>
	</div>
	{#if advanced && advancedOpen}
		<div class="mt-1.5 border-t border-gray-200 px-3 py-3 dark:border-gray-800">
			{@render advanced()}
		</div>
	{/if}
</div>
