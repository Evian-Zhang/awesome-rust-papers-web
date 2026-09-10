import { browser } from '$app/environment';

let isDark = $state(false);

function apply(dark: boolean) {
	isDark = dark;
	if (!browser) return;
	document.documentElement.classList.toggle('dark', dark);
	localStorage.setItem('theme', dark ? 'dark' : 'light');
}

if (browser) {
	isDark = document.documentElement.classList.contains('dark');
}

export const theme = {
	get isDark() {
		return isDark;
	},
	toggle() {
		apply(!isDark);
	}
};
