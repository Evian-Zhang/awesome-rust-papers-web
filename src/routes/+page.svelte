<script lang="ts">
	import Analytics from '$lib/components/Analytics.svelte';
	import Header from '$lib/components/Header.svelte';
	import PaperList from '$lib/components/PaperList.svelte';
	import SearchBox from '$lib/components/SearchBox.svelte';
	import QueryBuilder from '$lib/components/querybuilder/QueryBuilder.svelte';
	import { searchState } from '$lib/searchState.svelte';
	import { data } from '$lib/data';

	const filteredPapers = $derived(searchState.filteredResults.map((r) => r.paper));
	const categoryCount = Object.keys(data.stats.categories).length;
	const venueCount = Object.keys(data.stats.venues).length;
</script>

<svelte:head>
	<title>Awesome Rust Papers Explorer</title>
</svelte:head>

<Header />

<main class="mx-auto max-w-6xl space-y-8 px-4 py-6">
	<p class="text-sm text-gray-600 dark:text-gray-400">
		A curated collection of
		<span class="font-semibold text-gray-900 dark:text-gray-100">{data.totalPapers}</span>
		Rust academic papers spanning
		<span class="font-semibold text-gray-900 dark:text-gray-100">{categoryCount}</span>
		categories and
		<span class="font-semibold text-gray-900 dark:text-gray-100">{venueCount}</span>
		venues. Browse, search and analyze with a structured query builder — relations like references, based-on
		and compared-with are first-class query dimensions.
	</p>

	<SearchBox>
		{#snippet advanced()}
			<QueryBuilder />
		{/snippet}
	</SearchBox>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-5 lg:items-start">
		<div class="lg:col-span-3">
			<PaperList />
		</div>
		<div class="lg:col-span-2">
			<div class="lg:sticky lg:top-4">
				<Analytics papers={filteredPapers} />
			</div>
		</div>
	</div>
</main>

<footer class="border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
	<div class="mx-auto max-w-6xl px-4 py-4 text-xs text-gray-500 dark:text-gray-400">
		Data from
		<a
			href="https://github.com/Evian-Zhang/awesome-rust-papers"
			target="_blank"
			rel="noreferrer"
			class="hover:text-rust-600 hover:underline dark:hover:text-rust-400"
		>
			Evian-Zhang/awesome-rust-papers
		</a>
		· charts by Apache ECharts
	</div>
</footer>
