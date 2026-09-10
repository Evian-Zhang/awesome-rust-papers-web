import assert from 'node:assert/strict';
import { papers } from '../src/lib/data.ts';
import { evalQueryTree } from '../src/lib/query/evaluate.ts';
import { decodeTreeParam, encodeTreeParam, serializeQuery } from '../src/lib/query/serialize.ts';
import { collectInvalidConditions, isConditionComplete } from '../src/lib/query/validate.ts';
import type { ConditionGroup, ConditionOp, QueryNode } from '../src/lib/types.ts';

assert.ok(papers.length > 0, 'dataset is empty');

// All fixture values are picked dynamically from the dataset: scan from the
// start and take the first suitable candidate; fail loudly if none exists.
function requireCandidate<T>(label: string, value: T | undefined): T {
	if (value === undefined) throw new Error(`no candidate found in dataset for: ${label}`);
	return value;
}

const categoryPaper = requireCandidate(
	'a paper with a category',
	papers.find((p) => p.categories.length > 0)
);
const categoryA = categoryPaper.categories[0];
const categoryB = requireCandidate(
	'a category distinct from the first one',
	(() => {
		for (const p of papers) {
			for (const c of p.categories) if (c !== categoryA) return c;
		}
		return undefined;
	})()
);
const venuePaper = requireCandidate(
	'a paper with a venue',
	papers.find((p) => p.venue)
);
const venue = venuePaper.venue!;
const referencesPaper = requireCandidate(
	'a paper with references',
	papers.find((p) => p.relations.references.length > 0)
);
const referencesTarget = referencesPaper.relations.references[0];
const comparedPaper = requireCandidate(
	'a paper with comparedWith relations',
	papers.find((p) => p.relations.comparedWith.length > 0)
);
const comparedTarget = comparedPaper.relations.comparedWith[0];
const samplePaper = papers[0];
const sampleYear = samplePaper.year;
const minYear = Math.min(...papers.map((p) => p.year));
const maxYear = Math.max(...papers.map((p) => p.year));
const textNeedle = samplePaper.title.split(/\s+/)[0].toLowerCase();

const cond = (id: string, field: string, op: ConditionOp, values: (string | number)[]) => ({
	id,
	field,
	op,
	values
});
const item = (id: string, node: QueryNode, connector: 'AND' | 'OR' = 'AND', not = false) => ({
	id,
	connector,
	not,
	node
});
const tree = (items: { id: string; connector: 'AND' | 'OR'; not: boolean; node: QueryNode }[]) => ({
	id: 'root' as const,
	items
});
const group = (id: string, items: ConditionGroup['items']) => ({ id, items });

const hits = (t: ReturnType<typeof tree>) => papers.filter((p) => evalQueryTree(p, t));

// --- Year operators ---
const yearEq = tree([item('i1', cond('c1', 'year', 'eq', [sampleYear]))]);
assert.ok(hits(yearEq).every((p) => p.year === sampleYear));
assert.ok(hits(yearEq).includes(samplePaper));

const yearGte = tree([item('i1', cond('c1', 'year', 'gte', [sampleYear]))]);
assert.ok(hits(yearGte).every((p) => p.year >= sampleYear));
assert.ok(hits(yearGte).includes(samplePaper));

const yearLte = tree([item('i1', cond('c1', 'year', 'lte', [sampleYear]))]);
assert.ok(hits(yearLte).every((p) => p.year <= sampleYear));
assert.ok(hits(yearLte).includes(samplePaper));

assert.equal(hits(tree([item('i1', cond('c1', 'year', 'gte', [minYear]))])).length, papers.length);

// --- Category equality, NOT ---
const catEq = tree([item('i1', cond('c1', 'category', 'eq', [categoryA]))]);
assert.ok(hits(catEq).every((p) => p.categories.includes(categoryA)));
assert.ok(hits(catEq).includes(categoryPaper));
const categoryACount = papers.filter((p) => p.categories.includes(categoryA)).length;

const notCat = tree([item('i1', cond('c1', 'category', 'eq', [categoryA]), 'AND', true)]);
assert.ok(hits(notCat).every((p) => !p.categories.includes(categoryA)));
assert.equal(hits(notCat).length, papers.length - categoryACount);

const notBoth = tree([
	item('i1', cond('c1', 'category', 'eq', [categoryA]), 'AND', true),
	item('i2', cond('c2', 'category', 'eq', [categoryB]), 'AND', true)
]);
assert.ok(
	hits(notBoth).every((p) => !p.categories.includes(categoryA) && !p.categories.includes(categoryB))
);

// --- NOT of an OR group ---
const notOr = tree([
	item(
		'ig1',
		group('g1', [
			item('i1', cond('c1', 'category', 'eq', [categoryA])),
			item('i2', cond('c2', 'category', 'eq', [categoryB]), 'OR')
		]),
		'AND',
		true
	)
]);
assert.ok(
	hits(notOr).every((p) => !p.categories.includes(categoryA) && !p.categories.includes(categoryB))
);

// --- Venue equality ---
const venueEq = tree([item('i1', cond('c1', 'venue', 'eq', [venue]))]);
assert.ok(hits(venueEq).every((p) => p.venue === venue));
assert.ok(hits(venueEq).includes(venuePaper));

// --- Relations ---
const refEq = tree([item('i1', cond('c1', 'references', 'eq', [referencesTarget]))]);
assert.ok(hits(refEq).every((p) => p.relations.references.includes(referencesTarget)));
assert.ok(hits(refEq).includes(referencesPaper));

const notRef = tree([item('i1', cond('c1', 'references', 'eq', [referencesTarget]), 'AND', true)]);
assert.ok(hits(notRef).every((p) => !p.relations.references.includes(referencesTarget)));

const cmpEq = tree([item('i1', cond('c1', 'comparedWith', 'eq', [comparedTarget]))]);
assert.ok(hits(cmpEq).every((p) => p.relations.comparedWith.includes(comparedTarget)));
assert.ok(hits(cmpEq).includes(comparedPaper));

// --- Text contains ---
const textEq = tree([item('i1', cond('c1', 'text', 'contains', [textNeedle]))]);
const textHits = hits(textEq);
assert.ok(textHits.includes(samplePaper));
const blob = (p: (typeof papers)[number]) =>
	[p.title, p.alias, p.bib, p.tags.join(' '), p.categories.join(' ')]
		.filter(Boolean)
		.join(' ')
		.toLowerCase();
assert.ok(textHits.every((p) => blob(p).includes(textNeedle)));

// --- Row connectors ---
const orTree = tree([
	item('i1', cond('c1', 'year', 'eq', [minYear])),
	item('i2', cond('c2', 'category', 'eq', [categoryB]), 'OR')
]);
assert.ok(hits(orTree).every((p) => p.year === minYear || p.categories.includes(categoryB)));

const nested = tree([
	item(
		'ig1',
		group('g1', [
			item('i1', cond('c1', 'category', 'eq', [categoryA])),
			item('i2', cond('c2', 'category', 'eq', [categoryB]), 'OR')
		])
	),
	item('i3', cond('c3', 'year', 'lte', [maxYear]), 'AND')
]);
const nestedHits = hits(nested);
assert.ok(
	nestedHits.every(
		(p) =>
			(p.categories.includes(categoryA) || p.categories.includes(categoryB)) && p.year <= maxYear
	)
);
assert.ok(nestedHits.includes(categoryPaper));

// --- Empty condition / empty group match everything ---
assert.equal(hits(tree([item('i1', cond('c1', 'year', 'gte', []))])).length, papers.length);
assert.equal(hits(tree([item('i1', group('g1', []))])).length, papers.length);

// --- Validation (isConditionComplete / collectInvalidConditions) ---
assert.equal(isConditionComplete(cond('c1', 'year', 'gte', [])), false);
assert.equal(isConditionComplete(cond('c1', 'year', 'gte', ['not-a-number'])), false);
assert.equal(isConditionComplete(cond('c1', 'category', 'eq', [])), false);
assert.equal(isConditionComplete(cond('c1', 'category', 'eq', ['whatever'])), true);
assert.equal(isConditionComplete(cond('c1', 'year', 'eq', [sampleYear])), true);

const invalidTree = tree([
	item('i1', cond('c1', 'year', 'gte', [])),
	item('ig1', group('g1', [item('i2', cond('c2', 'category', 'eq', []))]), 'AND'),
	item('i3', cond('c3', 'venue', 'eq', [venue]))
]);
assert.deepEqual(collectInvalidConditions(invalidTree), new Set(['c1', 'c2']));
assert.equal(collectInvalidConditions(tree([])).size, 0);

// --- URL tree param encode/decode round-trip and malformed inputs ---
const urlTree = tree([
	item('i1', cond('c1', 'year', 'gte', [sampleYear])),
	item(
		'ig1',
		group('g1', [
			item('i2', cond('c2', 'category', 'eq', [categoryA])),
			item('i3', cond('c3', 'category', 'eq', [categoryB]), 'OR')
		]),
		'AND',
		true
	)
]);
const roundTrip = decodeTreeParam(encodeTreeParam(urlTree));
assert.deepEqual(serializeQuery(roundTrip), serializeQuery(urlTree), 'tree param round-trip');
assert.equal(decodeTreeParam('').items.length, 0, 'empty param -> empty tree');
assert.equal(decodeTreeParam('garbage').items.length, 0, 'malformed param -> empty tree');
assert.equal(
	decodeTreeParam(encodeURIComponent('[1,2,3]')).items.length,
	0,
	'non-tree json -> empty tree'
);
assert.equal(
	decodeTreeParam(encodeURIComponent(JSON.stringify({ id: 'root', items: 'nope' }))).items.length,
	0,
	'bad items -> empty tree'
);

console.log('all logic tests passed');
