import { compareByAddedAtThenTitle, papers as allPapers } from './data.ts';
import type { Paper } from '#lib/types.ts';

export interface SearchResult {
	paper: Paper;
	score: number;
}

function scorePaper(paper: Paper, tokens: string[]): number {
	let score = 0;
	const title = paper.title.toLowerCase();
	const alias = paper.alias?.toLowerCase() ?? '';
	const bib = paper.bib?.toLowerCase() ?? '';
	const furtherTitles = paper.links.further.map((entry) => entry.title.toLowerCase());
	const furtherBibs = paper.links.further.map((entry) => entry.bib?.toLowerCase() ?? '');
	const rest = [paper.tags.join(' '), paper.categories.join(' ')].join(' ').toLowerCase();
	for (const token of tokens) {
		if (title.startsWith(token)) score += 6;
		else if (title.includes(token)) score += 5;
		else if (furtherTitles.some((entry) => entry.startsWith(token))) score += 6;
		else if (furtherTitles.some((entry) => entry.includes(token))) score += 5;
		else if (alias.includes(token)) score += 4;
		else if (bib.includes(token) || furtherBibs.some((entry) => entry.includes(token))) score += 2;
		else if (rest.includes(token)) score += 1;
		else return -1;
	}
	return score;
}

export function searchPapers(query: string): SearchResult[] {
	const q = query.trim().toLowerCase();
	if (!q) return [];
	const tokens = q.split(/\s+/).filter(Boolean);
	const results: SearchResult[] = [];
	for (const paper of allPapers) {
		const score = scorePaper(paper, tokens);
		if (score >= 0) results.push({ paper, score });
	}
	results.sort((a, b) => b.score - a.score || compareByAddedAtThenTitle(a.paper, b.paper));
	return results;
}
