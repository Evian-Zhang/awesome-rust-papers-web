import type {
	Condition,
	ConditionGroup,
	ConditionOp,
	GroupItem,
	QueryNode,
	QueryTree
} from '$lib/types';
import { paperById } from '../data.ts';
import { OPERATOR_SYMBOLS, fieldById } from './fields.ts';

function titleWithAlias(id: string): string {
	const paper = paperById.get(id);
	if (!paper) return id;
	return paper.alias ? `${paper.title} AKA: ${paper.alias}` : paper.title;
}

function conditionText(cond: Condition): string {
	const label = fieldById.get(cond.field)?.label ?? cond.field;
	const op = OPERATOR_SYMBOLS[cond.op] ?? cond.op;
	let value: string;
	if (cond.values.length === 0) {
		value = '…';
	} else {
		value = cond.values
			.map((v) => {
				if (cond.field === 'text') return `"${v}"`;
				if (fieldById.get(cond.field)?.kind === 'relation') return titleWithAlias(String(v));
				return String(v);
			})
			.join(', ');
	}
	return `${label} ${op} ${value}`;
}

export function serializeGroup(group: ConditionGroup): string {
	const parts: string[] = [];
	group.items.forEach((item, index) => {
		let text = 'items' in item.node ? `(${serializeGroup(item.node)})` : conditionText(item.node);
		if (item.not) text = `NOT ${text}`;
		parts.push(index === 0 ? text : `${item.connector} ${text}`);
	});
	return parts.join(' ');
}

export function serializeQuery(tree: QueryTree): string {
	return serializeGroup(tree);
}

function sanitizeTree(input: unknown): QueryTree {
	let condSeq = 0;
	let groupSeq = 0;
	let itemSeq = 0;

	const walkGroup = (value: unknown): ConditionGroup => {
		const obj = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
		const rawItems = Array.isArray(obj.items) ? obj.items : [];
		const items: GroupItem[] = [];
		for (const raw of rawItems) {
			if (!raw || typeof raw !== 'object') continue;
			const it = raw as Record<string, unknown>;
			if (!it.node || typeof it.node !== 'object') continue;
			const node = it.node as Record<string, unknown>;
			let clean: QueryNode | null = null;
			if (Array.isArray(node.items)) {
				clean = walkGroup(node);
			} else if (
				typeof node.field === 'string' &&
				typeof node.op === 'string' &&
				Array.isArray(node.values)
			) {
				clean = {
					id: `c-${++condSeq}`,
					field: node.field,
					op: ['eq', 'gte', 'lte', 'contains'].includes(node.op) ? (node.op as ConditionOp) : 'eq',
					values: node.values.filter((v) => typeof v === 'string' || typeof v === 'number')
				};
			}
			if (!clean) continue;
			items.push({
				id: `i-${++itemSeq}`,
				connector: it.connector === 'OR' ? 'OR' : 'AND',
				not: it.not === true,
				node: clean
			});
		}
		return { id: `g-${++groupSeq}`, items };
	};

	const root = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
	if (root.id !== 'root' || !Array.isArray(root.items)) return { id: 'root', items: [] };
	return { id: 'root', items: walkGroup(root).items };
}

export function encodeTreeParam(tree: QueryTree): string {
	return encodeURIComponent(JSON.stringify(tree));
}

export function decodeTreeParam(param: string): QueryTree {
	if (!param) return { id: 'root', items: [] };
	try {
		return sanitizeTree(JSON.parse(decodeURIComponent(param)));
	} catch {
		return { id: 'root', items: [] };
	}
}
