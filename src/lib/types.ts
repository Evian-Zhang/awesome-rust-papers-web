export interface PaperLinks {
	link?: string | null;
	pdf?: string | null;
	repo?: string | null;
	further: string[];
}

export interface PaperRelations {
	references: string[];
	referencedBy: string[];
	basedOn: string[];
	basedOnExternal: string[];
	basedBy: string[];
	comparedWith: string[];
	comparedWithExternal: string[];
	comparedBy: string[];
}

export interface Paper {
	id: string;
	title: string;
	alias?: string | null;
	venue?: string | null;
	year: number;
	categories: string[];
	tags: string[];
	links: PaperLinks;
	relations: PaperRelations;
	citedBy: number;
	bib?: string | null;
}

export interface PaperStats {
	categories: Record<string, number>;
	tags: Record<string, number>;
	venues: Record<string, number>;
	years: Record<string, number>;
}

export interface PaperData {
	totalPapers: number;
	stats: PaperStats;
	papers: Paper[];
}

export type ConditionOp = 'eq' | 'gte' | 'lte' | 'contains';

export interface Condition {
	id: string;
	field: string;
	op: ConditionOp;
	values: (string | number)[];
}

export interface GroupItem {
	id: string;
	connector: 'AND' | 'OR';
	not: boolean;
	node: QueryNode;
}

export interface ConditionGroup {
	id: string;
	items: GroupItem[];
}

export type QueryNode = Condition | ConditionGroup;

export interface QueryTree {
	id: 'root';
	items: GroupItem[];
}
