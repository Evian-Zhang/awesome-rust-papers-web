import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import type {
	Condition,
	ConditionGroup,
	ConditionOp,
	GroupItem,
	QueryNode,
	QueryTree
} from '#lib/types.ts';
import { paperById } from '../data.ts';
import { OPERATOR_SYMBOLS, fieldById } from './fields.ts';
import * as pb from './gen/query_pb.js';

const PROTO_VERSION = 1;
const MAX_ENCODED_LENGTH = 8192;
const MAX_DECODED_BYTES = 8192;
const MAX_ITEMS = 200;
const MAX_DEPTH = 10;
const MAX_VALUE_LENGTH = 256;

function titleWithAlias(id: string): string {
	const paper = paperById.get(id);
	if (!paper) return id;
	return paper.alias ? `${paper.title} AKA: ${paper.alias}` : paper.title;
}

function conditionText(cond: Condition): string {
	const label = fieldById.get(cond.field)?.label ?? cond.field;
	const op = OPERATOR_SYMBOLS[cond.op] ?? cond.op;
	let value: string;
	if (cond.value === undefined) {
		value = '…';
	} else if (cond.field === 'text') {
		value = `"${cond.value}"`;
	} else if (fieldById.get(cond.field)?.kind === 'relation') {
		value = titleWithAlias(String(cond.value));
	} else {
		value = String(cond.value);
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

function opToProto(op: ConditionOp): pb.Operator {
	switch (op) {
		case 'gte':
			return pb.Operator.GTE;
		case 'lte':
			return pb.Operator.LTE;
		case 'contains':
			return pb.Operator.CONTAINS;
		default:
			return pb.Operator.EQ;
	}
}

function opFromProto(op: pb.Operator): ConditionOp | null {
	switch (op) {
		case pb.Operator.EQ:
			return 'eq';
		case pb.Operator.GTE:
			return 'gte';
		case pb.Operator.LTE:
			return 'lte';
		case pb.Operator.CONTAINS:
			return 'contains';
		default:
			return null;
	}
}

function encodeValue(value: string | number): pb.Value {
	if (typeof value === 'number') {
		return create(pb.ValueSchema, {
			kind: { case: 'number', value: Number.isFinite(value) ? Math.trunc(value) : 0 }
		});
	}
	return create(pb.ValueSchema, { kind: { case: 'text', value } });
}

function encodeCondition(cond: Condition): pb.Condition {
	return create(pb.ConditionSchema, {
		field: cond.field,
		operator: opToProto(cond.op),
		value: cond.value === undefined ? undefined : encodeValue(cond.value)
	});
}

function encodeItem(item: GroupItem): pb.GroupItem {
	const node =
		'items' in item.node
			? create(pb.NodeSchema, {
					kind: {
						case: 'group',
						value: create(pb.GroupSchema, {
							items: item.node.items.map(encodeItem)
						})
					}
				})
			: create(pb.NodeSchema, {
					kind: { case: 'condition', value: encodeCondition(item.node) }
				});
	return create(pb.GroupItemSchema, {
		connector: item.connector === 'OR' ? pb.Connector.OR : pb.Connector.AND,
		negated: item.not,
		node
	});
}

function bytesToBase64Url(bytes: Uint8Array): string {
	let binary = '';
	const chunkSize = 0x8000;
	for (let offset = 0; offset < bytes.length; offset += chunkSize) {
		binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
	}
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(value: string): Uint8Array {
	const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
	const padding = (4 - (base64.length % 4)) % 4;
	const binary = atob(base64 + '='.repeat(padding));
	const bytes = new Uint8Array(binary.length);
	for (let index = 0; index < binary.length; index++) {
		bytes[index] = binary.charCodeAt(index);
	}
	return bytes;
}

export function encodeTreeParam(tree: QueryTree): string {
	const message = create(pb.QueryTreeSchema, {
		version: PROTO_VERSION,
		items: tree.items.map(encodeItem)
	});
	return bytesToBase64Url(toBinary(pb.QueryTreeSchema, message));
}

interface DecodeCounter {
	items: number;
	itemIds: number;
	groupIds: number;
	conditionIds: number;
}

function decodeValue(value: pb.Value, specKind: 'number' | 'text' | 'enum' | 'relation') {
	if (value.kind?.case === 'number') {
		if (specKind !== 'number' || !Number.isSafeInteger(value.kind.value)) return undefined;
		return value.kind.value;
	}
	if (value.kind?.case === 'text') {
		if (specKind === 'number' || value.kind.value.length > MAX_VALUE_LENGTH) return undefined;
		return value.kind.value;
	}
	return undefined;
}

function decodeCondition(cond: pb.Condition, counter: DecodeCounter): Condition | null {
	const spec = fieldById.get(cond.field);
	if (!spec) return null;
	const op = opFromProto(cond.operator);
	if (!op || !spec.operators.some((candidate) => candidate.id === op)) return null;

	const value = cond.value === undefined ? undefined : decodeValue(cond.value, spec.kind);
	if (value === undefined) return null;

	return { id: `c-${++counter.conditionIds}`, field: cond.field, op, value };
}

function decodeNode(
	node: pb.Node | undefined,
	depth: number,
	counter: DecodeCounter
): QueryNode | null {
	if (!node || node.kind.case === undefined) return null;
	if (node.kind.case === 'group') {
		if (depth >= MAX_DEPTH) return null;
		return {
			id: `g-${++counter.groupIds}`,
			items: decodeItems(node.kind.value.items, depth + 1, counter)
		};
	}
	if (node.kind.case === 'condition') {
		return decodeCondition(node.kind.value, counter);
	}
	return null;
}

function decodeItem(item: pb.GroupItem, depth: number, counter: DecodeCounter): GroupItem | null {
	if (counter.items >= MAX_ITEMS) return null;
	counter.items++;
	const node = decodeNode(item.node, depth, counter);
	if (!node) return null;
	return {
		id: `i-${++counter.itemIds}`,
		connector: item.connector === pb.Connector.OR ? 'OR' : 'AND',
		not: item.negated,
		node
	};
}

function decodeItems(items: pb.GroupItem[], depth: number, counter: DecodeCounter): GroupItem[] {
	const decoded: GroupItem[] = [];
	for (const item of items) {
		if (counter.items >= MAX_ITEMS) break;
		const next = decodeItem(item, depth, counter);
		if (next) decoded.push(next);
	}
	return decoded;
}

function emptyTree(): QueryTree {
	return { id: 'root', items: [] };
}

export function decodeTreeParam(param: string): QueryTree {
	if (!param || param.length > MAX_ENCODED_LENGTH) return emptyTree();
	try {
		const bytes = base64UrlToBytes(param);
		if (bytes.length > MAX_DECODED_BYTES) return emptyTree();
		const message = fromBinary(pb.QueryTreeSchema, bytes);
		if (message.version !== PROTO_VERSION) return emptyTree();
		const counter: DecodeCounter = { items: 0, itemIds: 0, groupIds: 0, conditionIds: 0 };
		return { id: 'root', items: decodeItems(message.items, 0, counter) };
	} catch {
		return emptyTree();
	}
}
