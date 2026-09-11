<script lang="ts">
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import ExternalLink from 'lucide-svelte/icons/external-link';
	import { onDestroy } from 'svelte';
	import { paperById } from '$lib/data';
	import { searchState } from '$lib/searchState.svelte';
	import PaperName from './PaperName.svelte';
	import type { Paper } from '$lib/types';

	let { paper }: { paper: Paper } = $props();

	let showBib = $state(false);
	let showFurther = $state(false);
	let copied = $state(false);
	let copyFailed = $state(false);
	let expanded = $state<string | null>(null);

	let copylTimer: ReturnType<typeof setTimeout> | undefined;

	const relationGroups = $derived(
		[
			{ key: 'references', label: 'References', ids: paper.relations.references, external: [] },
			{
				key: 'referencedBy',
				label: 'Referenced by',
				ids: paper.relations.referencedBy,
				external: []
			},
			{
				key: 'basedOn',
				label: 'Based on',
				ids: paper.relations.basedOn,
				external: paper.relations.basedOnExternal
			},
			{ key: 'basedBy', label: 'Basis for', ids: paper.relations.basedBy, external: [] },
			{
				key: 'comparedWith',
				label: 'Compared with',
				ids: paper.relations.comparedWith,
				external: paper.relations.comparedWithExternal
			},
			{ key: 'comparedBy', label: 'Compared by', ids: paper.relations.comparedBy, external: [] }
		].filter((g) => g.ids.length > 0 || g.external.length > 0)
	);

	let expandedGroup = $derived(relationGroups.find((g) => g.key === expanded));

	function toggleRelation(key: string) {
		expanded = expanded === key ? null : key;
	}

	// Plain left click performs an in-page fresh search (?q=title, no filters);
	// modified clicks (new tab etc.) fall through to the native anchor.
	function searchForPaper(event: MouseEvent, title: string) {
		if (
			event.defaultPrevented ||
			event.button !== 0 ||
			event.metaKey ||
			event.ctrlKey ||
			event.shiftKey ||
			event.altKey
		)
			return;
		event.preventDefault();
		searchState.searchFor(title);
	}

	async function copyBib() {
		if (!paper.bib) return;
		try {
			await navigator.clipboard.writeText(paper.bib);
			copied = true;
			copyFailed = false;
		} catch {
			copyFailed = true;
			copied = false;
		}
		clearTimeout(copylTimer);
		copylTimer = setTimeout(() => {
			copied = false;
			copyFailed = false;
		}, 2000);
	}

	onDestroy(() => clearTimeout(copylTimer));
</script>

<article
	class="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
>
	<div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
		<PaperName
			entry={paper}
			href={paper.links.link}
			class="font-medium text-gray-900 hover:text-rust-600 dark:text-gray-100 dark:hover:text-rust-400"
		/>
	</div>

	<div
		class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 dark:text-gray-400"
	>
		{#if paper.venue}
			<span>{paper.venue}</span>
			<span aria-hidden="true">·</span>
		{/if}
		<span class="tabular-nums">{paper.year}</span>
		{#if paper.categories.length > 0}
			<span
				class="inline-flex items-center gap-1 rounded bg-rust-50 px-1.5 py-0.5 text-[11px] font-medium text-rust-700 dark:bg-rust-950 dark:text-rust-300"
			>
				{#each paper.categories as category, index (category)}
					{#if index > 0}
						<span aria-hidden="true" class="text-rust-400/80 dark:text-rust-400">›</span>
					{/if}
					<span>{category}</span>
				{/each}
			</span>
		{/if}
		{#each paper.tags as tag (tag)}
			<span
				class="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600 dark:bg-gray-800 dark:text-gray-300"
			>
				{tag}
			</span>
		{/each}
	</div>

	<div class="mt-2 flex flex-wrap items-center gap-1">
		{#if paper.links.pdf}
			<a href={paper.links.pdf} target="_blank" rel="noreferrer external" class="card-action">
				PDF
			</a>
		{/if}
		{#if paper.links.repo}
			<a href={paper.links.repo} target="_blank" rel="noreferrer external" class="card-action">
				Code
			</a>
		{/if}
		{#if paper.bib}
			<button
				type="button"
				class="card-action"
				onclick={() => (showBib = !showBib)}
				aria-expanded={showBib}
			>
				BibTeX
			</button>
		{/if}
		{#if paper.links.further.length > 0}
			<button
				type="button"
				class="card-action"
				onclick={() => (showFurther = !showFurther)}
				aria-expanded={showFurther}
			>
				Further reading {paper.links.further.length}
			</button>
		{/if}
	</div>

	{#if showFurther && paper.links.further.length > 0}
		<div
			class="mt-2 rounded-md border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800/60"
		>
			<ul class="max-h-40 space-y-1 overflow-y-auto">
				{#each paper.links.further as url (url)}
					<li>
						<a
							href={url}
							target="_blank"
							rel="noreferrer external"
							class="flex items-center gap-1.5 rounded px-1.5 py-1 text-xs text-rust-700 hover:bg-rust-50 dark:text-rust-400 dark:hover:bg-rust-950"
						>
							<span class="truncate" title={url}>{url.replace(/^https?:\/\//, '')}</span>
							<ExternalLink size={12} class="shrink-0 text-gray-400 dark:text-gray-500" />
						</a>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	{#if showBib && paper.bib}
		<div
			class="relative mt-2 rounded-md border border-gray-200 bg-gray-50 p-2 pr-16 dark:border-gray-700 dark:bg-gray-800/60"
		>
			<button
				type="button"
				class="absolute top-2 right-2 rounded-md border border-gray-300 bg-white px-2 py-0.5 text-xs text-gray-600 hover:border-rust-600 hover:text-rust-600 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-rust-400 dark:hover:text-rust-400"
				onclick={copyBib}
			>
				{copied ? 'Copied!' : copyFailed ? 'Copy failed' : 'Copy'}
			</button>
			<pre
				class="max-h-56 overflow-auto font-mono text-[11px] leading-relaxed break-all whitespace-pre-wrap text-gray-700 dark:text-gray-300">{paper.bib}</pre>
		</div>
	{/if}

	{#if relationGroups.length > 0}
		<div
			class="mt-2 flex flex-wrap items-center gap-x-1 gap-y-1 text-xs text-gray-500 dark:text-gray-400"
		>
			{#each relationGroups as group (group.key)}
				<button
					type="button"
					class="flex items-center gap-0.5 rounded px-1.5 py-1 hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-800 dark:hover:text-gray-200 {expanded ===
					group.key
						? 'bg-gray-100 font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-200'
						: ''}"
					onclick={() => toggleRelation(group.key)}
					aria-expanded={expanded === group.key}
				>
					{group.label} <span class="tabular-nums">{group.ids.length + group.external.length}</span>
					<ChevronDown
						size={12}
						class="transition-transform {expanded === group.key ? 'rotate-180' : ''}"
					/>
				</button>
				{#if group.key !== relationGroups[relationGroups.length - 1].key}
					<span aria-hidden="true">·</span>
				{/if}
			{/each}
		</div>

		{#if expandedGroup}
			<div
				class="mt-1.5 rounded-md border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800/60"
			>
				<div class="max-h-56 space-y-1 overflow-y-auto">
					{#each expandedGroup.ids as id (id)}
						{@const related = paperById.get(id)}
						{#if related}
							<!-- eslint-disable svelte/no-navigation-without-resolve -- query-only relative href, inherently base-path safe -->
							<a
								href={`?q=${encodeURIComponent(related.title)}`}
								onclick={(e) => searchForPaper(e, related.title)}
								class="block rounded px-1.5 py-0.5 text-xs leading-relaxed text-gray-700 hover:bg-rust-50 hover:text-rust-700 dark:text-gray-300 dark:hover:bg-rust-950 dark:hover:text-rust-300"
							>
								<PaperName entry={related} year={related.year} />
							</a>
							<!-- eslint-enable svelte/no-navigation-without-resolve -->
						{/if}
					{/each}
					{#each expandedGroup.external as name (name)}
						<span
							class="mr-1 inline-flex items-center rounded bg-gray-200 px-1.5 py-0.5 text-[11px] text-gray-600 dark:bg-gray-700 dark:text-gray-300"
						>
							{name}
						</span>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
</article>
