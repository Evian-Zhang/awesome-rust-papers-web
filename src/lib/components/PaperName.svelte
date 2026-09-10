<script lang="ts">
	let {
		entry,
		href = null,
		year = null,
		fallback = '',
		class: className = ''
	}: {
		entry?: { title: string; alias?: string | null } | null;
		href?: string | null;
		year?: number | null;
		fallback?: string;
		class?: string;
	} = $props();

	const badgeClass =
		'ml-1 inline-block rounded bg-gray-100 px-1 py-px font-mono text-[10px] text-gray-500 align-middle dark:bg-gray-800 dark:text-gray-400';
</script>

{#if entry}
	{#if href}
		<a {href} target="_blank" rel="noreferrer external" class={className}>
			{entry.title}
			{#if entry.alias}<span class={badgeClass}>AKA: {entry.alias}</span>{/if}
			{#if year != null}<span class="text-gray-500"> ({year})</span>{/if}
		</a>
	{:else}
		<span class={className}>
			{entry.title}
			{#if entry.alias}<span class={badgeClass}>AKA: {entry.alias}</span>{/if}
			{#if year != null}<span class="text-gray-500"> ({year})</span>{/if}
		</span>
	{/if}
{:else}
	{fallback}
{/if}
