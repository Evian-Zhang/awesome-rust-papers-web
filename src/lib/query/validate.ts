import type { Condition, ConditionGroup, QueryTree } from '$lib/types';

export function isConditionComplete(cond: Condition): boolean {
	if (cond.values.length === 0) return false;
	if (cond.field === 'year') return !Number.isNaN(Number(cond.values[0]));
	return true;
}

export function collectInvalidConditions(tree: QueryTree): Set<string> {
	const invalid = new Set<string>();
	const walk = (group: ConditionGroup) => {
		for (const item of group.items) {
			if ('items' in item.node) walk(item.node);
			else if (!isConditionComplete(item.node)) invalid.add(item.node.id);
		}
	};
	walk(tree);
	return invalid;
}
