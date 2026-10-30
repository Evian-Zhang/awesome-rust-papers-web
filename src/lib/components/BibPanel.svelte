<script lang="ts">
	import { onDestroy } from 'svelte';

	let { bib }: { bib: string } = $props();

	let copied = $state(false);
	let copyFailed = $state(false);

	let copyTimer: ReturnType<typeof setTimeout> | undefined;

	async function copyBib() {
		try {
			await navigator.clipboard.writeText(bib);
			copied = true;
			copyFailed = false;
		} catch {
			copyFailed = true;
			copied = false;
		}
		clearTimeout(copyTimer);
		copyTimer = setTimeout(() => {
			copied = false;
			copyFailed = false;
		}, 2000);
	}

	onDestroy(() => clearTimeout(copyTimer));
</script>

<div
	class="relative mt-2 rounded-md border border-gray-200 bg-gray-50 p-2 pr-16 dark:border-gray-700 dark:bg-gray-800/60"
>
	<button
		type="button"
		class="absolute top-2 right-2 rounded-md border border-gray-300 bg-white px-2 py-0.5 text-xs text-gray-600 hover:border-rust-600 hover:text-rust-600 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-rust-400 dark:hover:text-rust-400"
		onclick={copyBib}
	>
		{copied ? 'Copied!' : copyFailed ? 'Copy failed' : 'Copy'}
	</button>
	<pre
		class="max-h-56 overflow-auto font-mono text-[11px] leading-relaxed break-all whitespace-pre-wrap text-gray-700 dark:text-gray-300">{bib}</pre>
</div>
