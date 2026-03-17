import type { WikiArticle } from '@wikihop/shared';

export async function fetchArticle(title: string, signal?: AbortSignal): Promise<Partial<WikiArticle>> {
  const res = await fetch(`/api/wiki/${encodeURIComponent(title)}?fields=html,links`, { signal });
  if (!res.ok) throw new Error(`Failed to fetch article: ${res.statusText}`);
  return res.json();
}
