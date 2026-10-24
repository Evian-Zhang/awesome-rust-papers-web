import { browser } from '$app/environment';
import { compareByAddedAtThenTitle, papers } from '$lib/data';
import { searchPapers, type SearchResult } from '$lib/search';
import { evalQueryTree, hasConditions } from '$lib/query/evaluate';
import { collectInvalidConditions } from '$lib/query/validate';
import { decodeTreeParam, encodeTreeParam } from '$lib/query/serialize';
import type { QueryTree, SearchMode } from '$lib/types';

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
// Text search and the advanced query tree are mutually exclusive: only the
// active mode participates in evaluation and URL serialization. The other
// mode keeps its applied state in memory, so switching tabs restores it.
let mode = $state<SearchMode>('text');

// Relevance is only meaningful while an applied text query is active.
function normalizeSortOrder() {
	if (sortOrder === 'relevance' && (mode !== 'text' || searchQuery.trim() === '')) {
		sortOrder = 'yearDesc';
	}
}

interface FilteredResult {
	paper: SearchResult['paper'];
	score: number;
}

const filteredResults = $derived.by(() => {
	const query = mode === 'text' ? searchQuery.trim() : '';
	let results: FilteredResult[];
	if (query) {
		results = searchPapers(query).map(({ paper, score }) => ({ paper, score }));
	} else {
		results = papers.map((paper) => ({ paper, score: 0 }));
	}
	if (mode === 'advanced') {
		results = results.filter(({ paper }) => evalQueryTree(paper, queryTree));
	}

	const effectiveSort: SortOrder = sortOrder === 'relevance' && !query ? 'yearDesc' : sortOrder;
	switch (effectiveSort) {
		case 'relevance':
			break;
		case 'yearDesc':
			results.sort(
				(a, b) => b.paper.year - a.paper.year || compareByAddedAtThenTitle(a.paper, b.paper)
			);
			break;
		case 'yearAsc':
			results.sort(
				(a, b) => a.paper.year - b.paper.year || compareByAddedAtThenTitle(a.paper, b.paper)
			);
			break;
		case 'titleAsc':
			results.sort((a, b) => a.paper.title.localeCompare(b.paper.title));
			break;
		case 'referencedByDesc':
			results.sort(
				(a, b) =>
					b.paper.relations.referencedBy.length - a.paper.relations.referencedBy.length ||
					compareByAddedAtThenTitle(a.paper, b.paper)
			);
			break;
	}
	return results;
});

function buildUrl(): string {
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- one-shot scratch object, stringified and discarded within this function; SvelteURLSearchParams would only add proxy overhead
	const params = new URLSearchParams();
	if (mode === 'advanced') {
		params.set('mode', 'advanced');
		if (hasConditions(queryTree)) params.set('f', encodeTreeParam(queryTree));
	} else {
		const q = searchQuery.trim();
		if (q) params.set('q', q);
	}
	if (sortOrder !== 'yearDesc') params.set('sort', sortOrder);
	const query = params.toString();
	return query ? `?${query}` : location.pathname;
}

function syncToUrl(historyMode: 'push' | 'replace' = 'replace') {
	if (!browser) return;
	const url = buildUrl();
	if (historyMode === 'push') history.pushState(null, '', url);
	else history.replaceState(null, '', url);
}

function loadFromUrl() {
	if (!browser) return;
	const params = new URLSearchParams(location.search);
	const modeParam = params.get('mode');
	const hasTree = params.has('f');
	// Old links with only `f` are treated as advanced.
	const nextMode: SearchMode =
		modeParam === 'advanced' || (modeParam === null && hasTree) ? 'advanced' : 'text';
	const q = params.get('q') ?? '';
	const tree = hasTree ? decodeTreeParam(params.get('f')!) : EMPTY_TREE();
	const sortParam = params.get('sort');
	const sort =
		sortParam && SORT_ORDERS.includes(sortParam as SortOrder)
			? (sortParam as SortOrder)
			: 'yearDesc';
	mode = nextMode;
	// Only the active mode's applied state is encoded in the URL; leave the
	// other mode's in-memory state alone so back/forward keeps it intact.
	if (nextMode === 'text') {
		draftSearchQuery = q;
		searchQuery = q;
	} else {
		draftQueryTree = tree;
		queryTree = tree;
	}
	sortOrder = sort;
	normalizeSortOrder();
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
	get mode() {
		return mode;
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
		return mode === 'text' ? searchQuery.trim() !== '' : hasConditions(queryTree);
	},
	applySearch(nextMode: SearchMode): boolean {
		if (nextMode === 'advanced') {
			const invalid = collectInvalidConditions(draftQueryTree);
			if (invalid.size > 0) {
				validationErrors = invalid;
				return false;
			}
			queryTree = draftQueryTree;
		} else {
			searchQuery = draftSearchQuery;
		}
		mode = nextMode;
		normalizeSortOrder();
		validationErrors = NO_ERRORS;
		syncToUrl('push');
		return true;
	},
	searchFor(query: string) {
		mode = 'text';
		draftSearchQuery = query;
		searchQuery = query;
		draftQueryTree = EMPTY_TREE();
		queryTree = EMPTY_TREE();
		normalizeSortOrder();
		validationErrors = NO_ERRORS;
		syncToUrl('push');
	},
	clearAll() {
		draftSearchQuery = '';
		draftQueryTree = EMPTY_TREE();
		searchQuery = '';
		queryTree = EMPTY_TREE();
		normalizeSortOrder();
		validationErrors = NO_ERRORS;
		syncToUrl('push');
	},
	clearSearch() {
		draftSearchQuery = '';
		searchQuery = '';
		normalizeSortOrder();
		syncToUrl('push');
	},
	clearFilters() {
		draftQueryTree = EMPTY_TREE();
		queryTree = EMPTY_TREE();
		validationErrors = NO_ERRORS;
		syncToUrl('push');
	}
};
