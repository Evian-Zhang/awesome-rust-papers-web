import { papers } from '#lib/data.ts';
import { buildFeed } from '#lib/feed.ts';

export const prerender = true;

export function GET() {
	return new Response(buildFeed(papers), {
		headers: { 'content-type': 'application/atom+xml; charset=utf-8' }
	});
}
