<script lang="ts">
	import Moon from '@lucide/svelte/icons/moon';
	import Sun from '@lucide/svelte/icons/sun';
	import { siGithub } from 'simple-icons';
	import { onMount } from 'svelte';
	import { theme } from '$lib/theme.svelte';

	const REPO = 'Evian-Zhang/awesome-rust-papers';
	let stars: string | null = $state(null);

	onMount(() => {
		const key = `gh-stars:${REPO}`;
		const cached = sessionStorage.getItem(key);
		if (cached) stars = cached;
		(async () => {
			try {
				const res = await fetch(`https://api.github.com/repos/${REPO}`, {
					headers: { Accept: 'application/vnd.github+json' }
				});
				if (!res.ok) return;
				const json: { stargazers_count?: number } = await res.json();
				if (typeof json.stargazers_count === 'number') {
					stars = String(json.stargazers_count);
					sessionStorage.setItem(key, stars);
				}
			} catch {
				// offline or rate-limited — keep cached value or omit the badge
			}
		})();
	});
</script>

<header class="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
	<div class="mx-auto flex max-w-6xl items-center gap-3 px-4 py-5">
		<h1 class="text-2xl font-bold tracking-tight">
			<span class="text-rust-600 dark:text-rust-400">Awesome Rust Papers</span>
			<span class="ml-2 text-lg font-medium text-gray-500 dark:text-gray-400">Explorer</span>
		</h1>
		<div class="ml-auto flex items-center gap-2">
			<button
				type="button"
				class="rounded-md border border-gray-300 bg-white p-2 text-gray-600 hover:border-rust-600 hover:text-rust-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-rust-400 dark:hover:text-rust-400"
				onclick={() => theme.toggle()}
				aria-label={theme.isDark ? 'Switch to light mode' : 'Switch to dark mode'}
				title={theme.isDark ? 'Switch to light mode' : 'Switch to dark mode'}
			>
				{#if theme.isDark}
					<Sun size={16} />
				{:else}
					<Moon size={16} />
				{/if}
			</button>
			<a
				class="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:border-rust-600 hover:text-rust-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-rust-400 dark:hover:text-rust-300"
				href="https://github.com/Evian-Zhang/awesome-rust-papers"
				target="_blank"
				rel="noreferrer"
				title="Star on GitHub"
			>
				<!-- GitHub brand mark — brand logos are out of scope for lucide; path data
			     comes from simple-icons (lucide's recommended brand icon source) -->
				<svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
					<path d={siGithub.path} />
				</svg>
				Star
				{#if stars !== null}
					<span
						class="rounded-full bg-gray-100 px-1.5 py-px text-xs font-semibold text-gray-600 tabular-nums dark:bg-gray-800 dark:text-gray-300"
					>
						{stars}
					</span>
				{/if}
			</a>
		</div>
	</div>
</header>
