<script lang="ts">
	import './layout.css';
	import { resolve } from '$app/paths';
	import { SITE_NAME, SITE_URL } from '#lib/site.ts';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="canonical" href={`${SITE_URL}/`} />
	<link
		rel="alternate"
		type="application/atom+xml"
		title={`${SITE_NAME} feed`}
		href={resolve('/feed.xml')}
	/>
</svelte:head>

{@render children()}
