import type { Attachment } from 'svelte/attachments';

export function clickOutside(onOutside: () => void): Attachment<HTMLElement> {
	return (element) => {
		function handlePointerDown(event: PointerEvent) {
			if (!element.contains(event.target as Node)) onOutside();
		}
		window.addEventListener('pointerdown', handlePointerDown);
		return () => window.removeEventListener('pointerdown', handlePointerDown);
	};
}

export function clampToViewport(isActive: () => boolean): Attachment<HTMLElement> {
	return (element) => {
		function clamp() {
			if (!isActive()) return;
			element.style.left = '';
			const rect = element.getBoundingClientRect();
			const anchorLeft = rect.left;
			const margin = 8;
			const vw = window.innerWidth;
			let left = 0;
			if (rect.right > vw - margin) left = vw - margin - rect.right;
			if (anchorLeft + left < margin) left = margin - anchorLeft;
			element.style.left = `${left}px`;
		}
		const observer = new ResizeObserver(clamp);
		observer.observe(element);
		window.addEventListener('resize', clamp);
		queueMicrotask(clamp);
		return () => {
			observer.disconnect();
			window.removeEventListener('resize', clamp);
		};
	};
}

export interface ListboxKeysOptions {
	enabled: () => boolean;
	onEscape?: () => void;
	onLeaveUpwards?: () => void;
}

export function listboxKeys(options: ListboxKeysOptions): Attachment<HTMLElement> {
	return (element) => {
		function handleKeydown(event: KeyboardEvent) {
			if (!options.enabled()) return;
			if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Escape') return;
			const items = element.querySelectorAll<HTMLButtonElement>('button[role="option"]');
			if (items.length === 0) return;
			event.preventDefault();
			const current = Array.from(items).findIndex((item) => item === document.activeElement);
			switch (event.key) {
				case 'ArrowDown':
					items[(current + 1) % items.length].focus();
					break;
				case 'ArrowUp':
					if (current <= 0 && options.onLeaveUpwards) options.onLeaveUpwards();
					else items[(current - 1 + items.length) % items.length].focus();
					break;
				case 'Escape':
					options.onEscape?.();
					break;
			}
		}
		element.addEventListener('keydown', handleKeydown);
		return () => element.removeEventListener('keydown', handleKeydown);
	};
}
