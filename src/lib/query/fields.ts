import { data as dataset, displayName, paperById, papers, relationIds } from '../data.ts';
import type { ConditionOp } from '../types.ts';

export type FieldKind = 'number' | 'text' | 'enum' | 'relation';

export interface FieldOption {
	value: string;
	label: string;
	count: number;
}

export interface OperatorSpec {
	id: ConditionOp;
	label: string;
}

export interface FieldSpec {
	id: string;
	label: string;
	kind: FieldKind;
	operators: OperatorSpec[];
	options: () => FieldOption[];
}

const NUMERIC_OPS: OperatorSpec[] = [
	{ id: 'eq', label: '=' },
	{ id: 'gte', label: '>=' },
	{ id: 'lte', label: '<=' }
];

const EQUALITY_OPS: OperatorSpec[] = [{ id: 'eq', label: '=' }];

function sortOptions(counts: Record<string, number>): FieldOption[] {
	return Object.entries(counts)
		.map(([value, count]) => ({ value, label: value, count }))
		.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function allRelationTargets(field: string): string[] {
	const set = new Set<string>();
	for (const paper of papers) {
		for (const id of relationIds(paper, field)) set.add(id);
	}
	return [...set];
}

function relationOptions(ids: string[]): FieldOption[] {
	return ids
		.map((id) => {
			const paper = paperById.get(id);
			return { value: id, label: paper ? displayName(paper) : id, count: 1 };
		})
		.sort((a, b) => a.label.localeCompare(b.label));
}

export const FIELDS: FieldSpec[] = [
	{
		id: 'year',
		label: 'Year',
		kind: 'number',
		operators: NUMERIC_OPS,
		options: () => []
	},
	{
		id: 'text',
		label: 'Text',
		kind: 'text',
		operators: [{ id: 'contains', label: 'Contains' }],
		options: () => []
	},
	{
		id: 'category',
		label: 'Category',
		kind: 'enum',
		operators: EQUALITY_OPS,
		options: () => sortOptions(dataset.stats.categories)
	},
	{
		id: 'tag',
		label: 'Tag',
		kind: 'enum',
		operators: EQUALITY_OPS,
		options: () => sortOptions(dataset.stats.tags)
	},
	{
		id: 'venue',
		label: 'Venue',
		kind: 'enum',
		operators: EQUALITY_OPS,
		options: () => sortOptions(dataset.stats.venues)
	},
	{
		id: 'references',
		label: 'References',
		kind: 'relation',
		operators: EQUALITY_OPS,
		options: () => relationOptions(allRelationTargets('references'))
	},
	{
		id: 'referencedBy',
		label: 'Referenced by',
		kind: 'relation',
		operators: EQUALITY_OPS,
		options: () => relationOptions(allRelationTargets('referencedBy'))
	},
	{
		id: 'basedOn',
		label: 'Based on',
		kind: 'relation',
		operators: EQUALITY_OPS,
		options: () => relationOptions(allRelationTargets('basedOn'))
	},
	{
		id: 'basedBy',
		label: 'Basis for',
		kind: 'relation',
		operators: EQUALITY_OPS,
		options: () => relationOptions(allRelationTargets('basedBy'))
	},
	{
		id: 'comparedWith',
		label: 'Compared with',
		kind: 'relation',
		operators: EQUALITY_OPS,
		options: () => relationOptions(allRelationTargets('comparedWith'))
	},
	{
		id: 'comparedBy',
		label: 'Compared by',
		kind: 'relation',
		operators: EQUALITY_OPS,
		options: () => relationOptions(allRelationTargets('comparedBy'))
	}
];

export const fieldById: Map<string, FieldSpec> = new Map(FIELDS.map((f) => [f.id, f]));

export const OPERATOR_SYMBOLS: Record<ConditionOp, string> = {
	eq: '=',
	gte: '>=',
	lte: '<=',
	contains: 'Contains'
};
