import { relationIds } from '../data.ts';
import { FIELDS } from './fields.ts';
import type { Condition, ConditionGroup, GroupItem, Paper, QueryTree } from '$lib/types';

const relationFields = new Set(
	FIELDS.filter((field) => field.kind === 'relation').map((field) => field.id)
);

function searchableBlob(paper: Paper): string {
	return [paper.title, paper.alias, paper.bib, paper.tags.join(' '), paper.categories.join(' ')]
		.filter(Boolean)
		.join(' ')
		.toLowerCase();
}

function evalEquality(paper: Paper, cond: Condition, value: string): boolean {
	switch (cond.field) {
		case 'venue':
			return paper.venue === value;
		case 'category':
			return paper.categories.includes(value);
		case 'tag':
			return paper.tags.includes(value);
		default:
			return relationFields.has(cond.field)
				? relationIds(paper, cond.field).includes(value)
				: false;
	}
}

function evalNumberCondition(paper: Paper, cond: Condition): boolean {
	const year = paper.year;
	const nums = cond.values.map((v) => Number(v));
	if (nums.length === 0 || nums.some(Number.isNaN)) return true;
	switch (cond.op) {
		case 'eq':
			return year === nums[0];
		case 'gte':
			return year >= nums[0];
		case 'lte':
			return year <= nums[0];
		default:
			return false;
	}
}

export function evalCondition(paper: Paper, cond: Condition): boolean {
	if (cond.values.length === 0) return true;
	switch (cond.field) {
		case 'year':
			return evalNumberCondition(paper, cond);
		case 'text':
			return searchableBlob(paper).includes(String(cond.values[0]).toLowerCase());
		default:
			return evalEquality(paper, cond, String(cond.values[0]));
	}
}

export function evalNode(paper: Paper, node: Condition | ConditionGroup): boolean {
	return 'items' in node ? evalGroup(paper, node) : evalCondition(paper, node);
}

function evalItem(paper: Paper, item: GroupItem): boolean {
	const value = evalNode(paper, item.node);
	return item.not ? !value : value;
}

export function evalGroup(paper: Paper, group: ConditionGroup): boolean {
	if (group.items.length === 0) return true;
	let acc = evalItem(paper, group.items[0]);
	for (let i = 1; i < group.items.length; i++) {
		const value = evalItem(paper, group.items[i]);
		acc = group.items[i].connector === 'AND' ? acc && value : acc || value;
	}
	return acc;
}

export function evalQueryTree(paper: Paper, tree: QueryTree): boolean {
	return evalGroup(paper, tree);
}

export function hasConditions(tree: QueryTree): boolean {
	const walk = (group: ConditionGroup): boolean =>
		group.items.some((item) => ('items' in item.node ? walk(item.node) : true));
	return walk(tree);
}
