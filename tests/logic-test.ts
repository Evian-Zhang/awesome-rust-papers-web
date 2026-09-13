import assert from 'node:assert/strict';
import { parseXml, XmlElement, XmlText } from '@rgrove/parse-xml';
import { compareByAddedAtThenTitle, papers } from '../src/lib/data.ts';
import { buildFeed } from '../src/lib/feed.ts';
import { SITE_URL } from '../src/lib/site.ts';
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

// --- Sort tie-breaking: addedAt desc, then title asc ---
const sortedByRecency = [...papers].sort(compareByAddedAtThenTitle);
for (let i = 1; i < sortedByRecency.length; i++) {
	const prev = sortedByRecency[i - 1];
	const cur = sortedByRecency[i];
	assert.ok(Date.parse(prev.addedAt) >= Date.parse(cur.addedAt), 'addedAt desc');
	if (Date.parse(prev.addedAt) === Date.parse(cur.addedAt)) {
		assert.ok(prev.title.localeCompare(cur.title) <= 0, 'same addedAt -> title asc');
	}
}

// --- Atom feed ---
// parseXml throws on malformed XML, so parsing also gates feed well-formedness.
assert.ok(
	papers.every((p) => typeof p.addedAt === 'string' && p.addedAt.length > 0),
	'every paper has an addedAt date'
);
const feed = buildFeed(papers);
const feedRoot = parseXml(feed).root;
assert.ok(feedRoot, 'feed has a root element');
assert.equal(feedRoot.name, 'feed');
assert.equal(feedRoot.attributes.xmlns, 'http://www.w3.org/2005/Atom');

const elements = (parent: XmlElement, name: string) =>
	parent.children.filter(
		(child): child is XmlElement => child instanceof XmlElement && child.name === name
	);
const text = (element: XmlElement) =>
	element.children
		.filter((child) => child instanceof XmlText)
		.map((child) => child.text)
		.join('');
const child = (parent: XmlElement, name: string) => {
	const [found] = elements(parent, name);
	assert.ok(found, `missing <${name}>`);
	return found;
};

const selfLink = elements(feedRoot, 'link').find((link) => link.attributes.rel === 'self');
assert.ok(selfLink, 'feed has a rel=self link');
assert.equal(selfLink.attributes.href, `${SITE_URL}/feed.xml`);

const maxAddedAt = papers.map((p) => Date.parse(p.addedAt)).reduce((a, b) => Math.max(a, b));
assert.equal(
	Date.parse(text(child(feedRoot, 'updated'))),
	maxAddedAt,
	'feed updated is the newest addedAt'
);

const entries = elements(feedRoot, 'entry');
assert.equal(entries.length, papers.length, 'feed includes every paper');

const byId = new Map(papers.map((paper) => [paper.id, paper]));
const entryOrder = entries.map((entry) => {
	const urn = text(child(entry, 'id'));
	assert.ok(urn.startsWith('urn:awesome-rust-papers:'), `unexpected entry id ${urn}`);
	const paper = requireCandidate(
		`paper for ${urn}`,
		byId.get(urn.replace('urn:awesome-rust-papers:', ''))
	);
	assert.equal(text(child(entry, 'title')), paper.title, 'entry title matches the paper');
	const link = new URL(child(entry, 'link').attributes.href);
	assert.equal(`${link.origin}${link.pathname}`, `${SITE_URL}/`, 'entry link points at the site');
	assert.equal(link.searchParams.get('q'), paper.title, 'entry link opens the in-site search');
	assert.equal(
		Date.parse(text(child(entry, 'updated'))),
		Date.parse(paper.addedAt),
		'entry date is the paper addedAt'
	);
	assert.ok(text(child(entry, 'summary')).length > 0, 'entry has a summary');
	return paper;
});
assert.equal(new Set(entryOrder.map((p) => p.id)).size, papers.length, 'entry ids are unique');

for (let i = 1; i < entryOrder.length; i++) {
	const prev = entryOrder[i - 1];
	const cur = entryOrder[i];
	assert.ok(Date.parse(prev.addedAt) >= Date.parse(cur.addedAt), 'entries sorted by addedAt desc');
	if (Date.parse(prev.addedAt) === Date.parse(cur.addedAt)) {
		assert.ok(prev.title <= cur.title, 'same-date entries sorted by title asc');
	}
}
assert.equal(buildFeed(papers), feed, 'feed build is deterministic');

console.log('all logic tests passed');
