import rawData from './generated/papers.json' with { type: 'json' };
import type { Paper, PaperData, PaperRelations } from '$lib/types';

export const data: PaperData = rawData as PaperData;

export const papers: Paper[] = data.papers;

export const paperById: Map<string, Paper> = new Map(papers.map((p) => [p.id, p]));

export function displayName(paper: Pick<Paper, 'alias' | 'title'>): string {
	return paper.alias ?? paper.title;
}

export interface AutocompleteCandidate {
	id: string;
	label: string;
	alias?: string | null;
	title: string;
}

export const autocompleteCandidates: AutocompleteCandidate[] = papers.map((p) => ({
	id: p.id,
	label: displayName(p),
	alias: p.alias,
	title: p.title
}));

export function searchAutocomplete(query: string, limit = 8) {
	const q = query.trim().toLowerCase();
	if (!q) return [];
	return autocompleteCandidates
		.filter((c) => c.label.toLowerCase().includes(q) || c.title.toLowerCase().includes(q))
		.slice(0, limit);
}

export function relationIds(paper: Pick<Paper, 'relations'>, field: string): string[] {
	return paper.relations[field as keyof PaperRelations] ?? [];
}
