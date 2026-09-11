import { browser } from '$app/environment';
import { papers } from '$lib/data';
import { searchPapers, type SearchResult } from '$lib/search';
import { evalQueryTree, hasConditions } from '$lib/query/evaluate';
import { collectInvalidConditions } from '$lib/query/validate';
import { decodeTreeParam, encodeTreeParam } from '$lib/query/serialize';
import type { QueryTree } from '$lib/types';

export type SortOrder = 'relevance' | 'yearDesc' | 'yearAsc' | 'titleAsc' | 'referencedByDesc';

const SORT_ORDERS: SortOrder[] = [
	'relevance',
	'yearDesc',
	'yearAsc',
	'titleAsc',
	'referencedByDesc'
];

const EMPTY_TREE = (): QueryTree => ({ id: 'root', items: [] });

let draftSearchQuery = $state('');
let draftQueryTree = $state<QueryTree>(EMPTY_TREE());

let searchQuery = $state('');
let queryTree = $state<QueryTree>(EMPTY_TREE());
// Snapshot of the conditions that failed the last applySearch(); never
// recomputed live — any edit to the draft voids the verdict wholesale.
// validationErrors is only ever reassigned, never mutated in place, so a
// shared empty instance serves as the neutral state.
const NO_ERRORS: Set<string> = new Set();
let validationErrors = $state<Set<string>>(NO_ERRORS);

let sortOrder = $state<SortOrder>('yearDesc');

interface FilteredResult {
	paper: SearchResult['paper'];
	score: number;
}

const filteredResults = $derived.by(() => {
	const query = searchQuery.trim();
	let results: FilteredResult[];
	if (query) {
		results = searchPapers(query).map(({ paper, score }) => ({ paper, score }));
	} else {
		results = papers.map((paper) => ({ paper, score: 0 }));
	}
	results = results.filter(({ paper }) => evalQueryTree(paper, queryTree));

	const effectiveSort: SortOrder = sortOrder === 'relevance' && !query ? 'yearDesc' : sortOrder;
	switch (effectiveSort) {
		case 'relevance':
			break;
		case 'yearDesc':
			results.sort(
				(a, b) => b.paper.year - a.paper.year || a.paper.title.localeCompare(b.paper.title)
			);
			break;
		case 'yearAsc':
			results.sort(
				(a, b) => a.paper.year - b.paper.year || a.paper.title.localeCompare(b.paper.title)
			);
			break;
		case 'titleAsc':
			results.sort((a, b) => a.paper.title.localeCompare(b.paper.title));
			break;
		case 'referencedByDesc':
			results.sort(
				(a, b) =>
					b.paper.relations.referencedBy.length - a.paper.relations.referencedBy.length ||
					b.paper.year - a.paper.year
			);
			break;
	}
	return results;
});

function buildUrl(): string {
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- one-shot scratch object, stringified and discarded within this function; SvelteURLSearchParams would only add proxy overhead
	const params = new URLSearchParams();
	const q = searchQuery.trim();
	if (q) params.set('q', q);
	if (hasConditions(queryTree)) params.set('f', encodeTreeParam(queryTree));
	if (sortOrder !== 'yearDesc') params.set('sort', sortOrder);
	const query = params.toString();
	return query ? `?${query}` : location.pathname;
}

function syncToUrl(mode: 'push' | 'replace' = 'replace') {
	if (!browser) return;
	const url = buildUrl();
	if (mode === 'push') history.pushState(null, '', url);
	else history.replaceState(null, '', url);
}

function loadFromUrl() {
	if (!browser) return;
	const params = new URLSearchParams(location.search);
	const q = params.get('q') ?? '';
	const tree = params.has('f') ? decodeTreeParam(params.get('f')!) : EMPTY_TREE();
	const sortParam = params.get('sort');
	const sort =
		sortParam && SORT_ORDERS.includes(sortParam as SortOrder)
			? (sortParam as SortOrder)
			: 'yearDesc';
	draftSearchQuery = q;
	searchQuery = q;
	draftQueryTree = tree;
	queryTree = tree;
	sortOrder = sort;
	validationErrors = NO_ERRORS;
}

if (browser) {
	loadFromUrl();
	window.addEventListener('popstate', loadFromUrl);
}

export const searchState = {
	get searchQuery() {
		return searchQuery;
	},
	get draftSearchQuery() {
		return draftSearchQuery;
	},
	set draftSearchQuery(value: string) {
		draftSearchQuery = value;
	},
	get queryTree() {
		return queryTree;
	},
	get draftQueryTree() {
		return draftQueryTree;
	},
	set draftQueryTree(value: QueryTree) {
		draftQueryTree = value;
		validationErrors = NO_ERRORS;
	},
	get sortOrder() {
		return sortOrder;
	},
	set sortOrder(value: SortOrder) {
		sortOrder = value;
		syncToUrl();
	},
	get filteredResults() {
		return filteredResults;
	},
	get validationErrors() {
		return validationErrors;
	},
	get hasActiveFilters() {
		return searchQuery.trim() !== '' || hasConditions(queryTree);
	},
	applySearch(): boolean {
		const invalid = collectInvalidConditions(draftQueryTree);
		if (invalid.size > 0) {
			validationErrors = invalid;
			return false;
		}
		validationErrors = NO_ERRORS;
		searchQuery = draftSearchQuery;
		queryTree = draftQueryTree;
		syncToUrl('push');
		return true;
	},
	searchFor(query: string) {
		draftSearchQuery = query;
		searchQuery = query;
		draftQueryTree = EMPTY_TREE();
		queryTree = EMPTY_TREE();
		validationErrors = NO_ERRORS;
		syncToUrl('push');
	},
	clearAll() {
		draftSearchQuery = '';
		draftQueryTree = EMPTY_TREE();
		searchQuery = '';
		queryTree = EMPTY_TREE();
		validationErrors = NO_ERRORS;
		syncToUrl('push');
	},
	clearSearch() {
		draftSearchQuery = '';
		searchQuery = '';
		syncToUrl('push');
	},
	clearFilters() {
		draftQueryTree = EMPTY_TREE();
		queryTree = EMPTY_TREE();
		validationErrors = NO_ERRORS;
		syncToUrl('push');
	}
};
