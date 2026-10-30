<script lang="ts">
	import BibPanel from './BibPanel.svelte';
	import PaperName from './PaperName.svelte';
	import type { FurtherEntry } from '#lib/types.ts';

	let { entry }: { entry: FurtherEntry } = $props();

	let showBib = $state(false);
</script>

<article
	class="rounded-md border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
>
	<PaperName
		{entry}
		href={entry.link}
		class="font-medium text-gray-900 hover:text-rust-600 dark:text-gray-100 dark:hover:text-rust-400"
	/>

	<div
		class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 dark:text-gray-400"
	>
		{#if entry.venue}
			<span>{entry.venue}</span>
			<span aria-hidden="true">·</span>
		{/if}
		<span class="tabular-nums">{entry.year}</span>
	</div>

	<div class="mt-2 flex flex-wrap items-center gap-1">
		{#if entry.pdf}
			<a href={entry.pdf} target="_blank" rel="noreferrer external" class="card-action">PDF</a>
		{/if}
		{#if entry.bib}
			<button
				type="button"
				class="card-action"
				onclick={() => (showBib = !showBib)}
				aria-expanded={showBib}
			>
				BibTeX
			</button>
		{/if}
	</div>

	{#if showBib && entry.bib}
		<BibPanel bib={entry.bib} />
	{/if}
</article>
