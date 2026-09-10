<script lang="ts">
	import { searchState } from '$lib/searchState.svelte';
	import type { ConditionGroup } from '$lib/types';
	import GroupEditor from './GroupEditor.svelte';

	let tree = $derived(searchState.draftQueryTree);

	function updateGroup(group: ConditionGroup) {
		searchState.draftQueryTree = { id: 'root', items: group.items };
	}
</script>

<div class="space-y-2">
	<h3 class="text-sm font-medium text-gray-600 dark:text-gray-400">Query builder</h3>
	{#if searchState.validationErrors.size > 0}
		<p class="text-xs font-medium text-red-600 dark:text-red-400" role="alert">
			{searchState.validationErrors.size}
			{searchState.validationErrors.size === 1 ? 'condition needs' : 'conditions need'} a value
		</p>
	{/if}
	<GroupEditor group={tree} onupdate={updateGroup} invalidIds={searchState.validationErrors} />
</div>
