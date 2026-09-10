<script lang="ts">
	import type { Paper } from '$lib/types';
	import { theme } from '$lib/theme.svelte';
	import {
		DARK_COLORS,
		LIGHT_COLORS,
		buildHorizontalOption,
		buildYearOption,
		chart,
		type TallyRow
	} from '$lib/charts.svelte';

	let { papers }: { papers: Paper[] } = $props();

	const VENUE_LIMIT = 15;
	const TAG_LIMIT = 15;

	function rowsHeight(rows: TallyRow[]): string {
		return `${Math.max(120, rows.length * 24)}px`;
	}

	function tally(list: Paper[], pick: (p: Paper) => string[]): TallyRow[] {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- local accumulator inside a $derived computation, never observed reactively; SvelteMap would only add proxy overhead
		const counts = new Map<string, number>();
		for (const paper of list) {
			for (const value of pick(paper)) {
				counts.set(value, (counts.get(value) ?? 0) + 1);
			}
		}
		return [...counts]
			.map(([label, count]) => ({ label, count }))
			.sort((a, b) => b.count - a.count);
	}

	function tallyYears(list: Paper[]): TallyRow[] {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- local accumulator inside a $derived computation, never observed reactively; SvelteMap would only add proxy overhead
		const counts = new Map<number, number>();
		for (const paper of list) {
			counts.set(paper.year, (counts.get(paper.year) ?? 0) + 1);
		}
		return [...counts]
			.map(([label, count]) => ({ label: String(label), count }))
			.sort((a, b) => Number(a.label) - Number(b.label));
	}

	const colors = $derived(theme.isDark ? DARK_COLORS : LIGHT_COLORS);
	const yearData = $derived(tallyYears(papers));
	const categoryData = $derived(tally(papers, (p) => p.categories));
	const venueData = $derived(
		tally(papers, (p) => (p.venue ? [p.venue] : [])).slice(0, VENUE_LIMIT)
	);
	const tagData = $derived(tally(papers, (p) => p.tags).slice(0, TAG_LIMIT));
</script>

<section
	aria-label="Analytics"
	class="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
>
	<div class="mb-3 flex items-baseline justify-between">
		<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Analytics</h2>
		<span class="text-xs text-gray-500 dark:text-gray-400">based on {papers.length} papers</span>
	</div>
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
		<div class="rounded-lg border border-gray-100 p-3 dark:border-gray-800">
			<h3 class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Papers by Year</h3>
			{#if yearData.length === 0}
				<div class="flex h-48 items-center justify-center text-sm text-gray-500 dark:text-gray-400">
					No data
				</div>
			{:else}
				<div class="h-48 w-full" {@attach chart(() => buildYearOption(yearData, colors))}></div>
			{/if}
		</div>
		<div class="rounded-lg border border-gray-100 p-3 dark:border-gray-800">
			<h3 class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Papers by Category</h3>
			{#if categoryData.length === 0}
				<div class="flex h-56 items-center justify-center text-sm text-gray-500 dark:text-gray-400">
					No data
				</div>
			{:else}
				<div
					class="w-full"
					style:height={rowsHeight(categoryData)}
					{@attach chart(() => buildHorizontalOption(categoryData, colors))}
				></div>
			{/if}
		</div>
		<div class="rounded-lg border border-gray-100 p-3 dark:border-gray-800">
			<h3 class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Papers by Venue</h3>
			{#if venueData.length === 0}
				<div class="flex h-56 items-center justify-center text-sm text-gray-500 dark:text-gray-400">
					No data
				</div>
			{:else}
				<div
					class="w-full"
					style:height={rowsHeight(venueData)}
					{@attach chart(() => buildHorizontalOption(venueData, colors))}
				></div>
			{/if}
		</div>
		<div class="rounded-lg border border-gray-100 p-3 dark:border-gray-800">
			<h3 class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Papers by Tag</h3>
			{#if tagData.length === 0}
				<div class="flex h-56 items-center justify-center text-sm text-gray-500 dark:text-gray-400">
					No data
				</div>
			{:else}
				<div
					class="w-full"
					style:height={rowsHeight(tagData)}
					{@attach chart(() => buildHorizontalOption(tagData, colors))}
				></div>
			{/if}
		</div>
	</div>
</section>
