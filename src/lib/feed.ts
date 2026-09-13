import { Feed } from 'feed';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from './site.ts';
import type { Paper } from './types.ts';

const FEED_AUTHOR = 'Evian-Zhang';
const FEED_AUTHOR_URI = 'https://github.com/Evian-Zhang';

function paperSummary(paper: Paper): string {
	const heading = [paper.venue, paper.year].filter(Boolean).join(' ');
	return [heading, paper.categories.join(', '), paper.tags.join(', ')].filter(Boolean).join(' · ');
}

function comparePapers(a: Paper, b: Paper): number {
	const dateA = Date.parse(a.addedAt);
	const dateB = Date.parse(b.addedAt);
	if (dateA !== dateB) return dateB - dateA;
	if (a.title !== b.title) return a.title < b.title ? -1 : 1;
	return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function buildFeed(papers: Paper[]): string {
	const sorted = [...papers].sort(comparePapers);
	const latest = sorted[0];
	if (!latest) throw new Error('cannot build an Atom feed from an empty dataset');

	const feed = new Feed({
		id: `${SITE_URL}/feed.xml`,
		title: SITE_NAME,
		description: SITE_DESCRIPTION,
		link: `${SITE_URL}/`,
		language: 'en',
		author: { name: FEED_AUTHOR, link: FEED_AUTHOR_URI },
		updated: new Date(latest.addedAt),
		feedLinks: { atom: `${SITE_URL}/feed.xml` }
	});

	for (const paper of sorted) {
		feed.addItem({
			title: paper.title,
			id: `urn:awesome-rust-papers:${paper.id}`,
			link: `${SITE_URL}/?q=${encodeURIComponent(paper.title)}`,
			date: new Date(paper.addedAt),
			description: paperSummary(paper)
		});
	}

	return feed.atom1();
}
