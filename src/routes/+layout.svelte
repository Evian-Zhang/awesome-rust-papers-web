<script lang="ts">
	import './layout.css';
	import { base } from '$app/paths';
	import { SITE_NAME, SITE_URL } from '$lib/site';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="canonical" href={`${SITE_URL}/`} />
	<link
		rel="alternate"
		type="application/atom+xml"
		title={`${SITE_NAME} feed`}
		href={`${base}/feed.xml`}
	/>
</svelte:head>

{@render children()}
