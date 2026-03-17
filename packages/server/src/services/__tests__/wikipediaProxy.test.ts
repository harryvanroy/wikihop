import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  fetchArticleLinks,
  fetchArticleHtml,
  fetchArticle,
  fetchRandomArticles,
  fetchTopArticles,
  clearCache,
} from '../wikipediaProxy';

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
  clearCache();
  mockFetch.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchArticleLinks', () => {
  it('returns an array of link titles from the API response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          query: {
            pages: {
              '123': {
                links: [{ title: 'Dog' }, { title: 'Fish' }, { title: 'Bird' }],
              },
            },
          },
        }),
    });

    const links = await fetchArticleLinks('Cat');

    expect(links).toEqual(['Dog', 'Fish', 'Bird']);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('handles pagination with plcontinue', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            query: {
              pages: {
                '123': {
                  links: [{ title: 'Dog' }, { title: 'Fish' }],
                },
              },
            },
            continue: { plcontinue: '123|0|Bird' },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            query: {
              pages: {
                '123': {
                  links: [{ title: 'Bird' }, { title: 'Snake' }],
                },
              },
            },
          }),
      });

    const links = await fetchArticleLinks('Cat');

    expect(links).toEqual(['Dog', 'Fish', 'Bird', 'Snake']);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('caches results and does not call fetch on second call', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          query: {
            pages: {
              '123': {
                links: [{ title: 'Dog' }],
              },
            },
          },
        }),
    });

    await fetchArticleLinks('Cat');
    const second = await fetchArticleLinks('Cat');

    expect(second).toEqual(['Dog']);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('throws an error on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expect(fetchArticleLinks('Cat')).rejects.toThrow(
      'Wikipedia API error: 500 Internal Server Error'
    );
  });

  it('returns empty array when page has no links', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          query: {
            pages: {
              '123': {},
            },
          },
        }),
    });

    const links = await fetchArticleLinks('EmptyArticle');
    expect(links).toEqual([]);
  });
});

describe('fetchArticleHtml', () => {
  it('returns html and pageid from the parse API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          parse: {
            title: 'Cat',
            pageid: 123,
            text: { '*': '<p>Cats are domesticated animals.</p>' },
          },
        }),
    });

    const result = await fetchArticleHtml('Cat');

    expect(result.html).toBe('<p>Cats are domesticated animals.</p>');
    expect(result.pageid).toBe(123);
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    await expect(fetchArticleHtml('NonexistentArticle')).rejects.toThrow(
      'Wikipedia API error: 404 Not Found'
    );
  });
});

describe('fetchArticle', () => {
  it('fetches both html and links and returns them', async () => {
    // First call: fetchArticleHtml (parse API)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          parse: {
            title: 'Cat',
            pageid: 123,
            text: { '*': '<p>HTML content</p>' },
          },
        }),
    });

    // Second call: fetchArticleLinks (query API)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          query: {
            pages: {
              '123': {
                links: [{ title: 'Dog' }],
              },
            },
          },
        }),
    });

    const result = await fetchArticle('Cat');

    expect(result.title).toBe('Cat');
    expect(result.html).toBe('<p>HTML content</p>');
    expect(result.pageid).toBe(123);
    expect(result.links).toEqual(['Dog']);
  });

  it('caches the full article and returns from cache on second call', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          parse: {
            title: 'Cat',
            pageid: 123,
            text: { '*': '<p>HTML</p>' },
          },
        }),
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          query: {
            pages: {
              '123': {
                links: [{ title: 'Dog' }],
              },
            },
          },
        }),
    });

    await fetchArticle('Cat');
    const second = await fetchArticle('Cat');

    expect(second.html).toBe('<p>HTML</p>');
    expect(second.links).toEqual(['Dog']);
    // Only 2 fetch calls for the first request, 0 for the cached one
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('respects the fields parameter', async () => {
    // Request only html (no links)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          parse: {
            title: 'Cat',
            pageid: 123,
            text: { '*': '<p>HTML only</p>' },
          },
        }),
    });

    const result = await fetchArticle('Cat', ['html']);

    expect(result.html).toBe('<p>HTML only</p>');
    expect(result.links).toBeUndefined();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe('fetchRandomArticles', () => {
  it('returns the correct number of articles', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          query: {
            random: [
              { id: 1, title: 'Article1' },
              { id: 2, title: 'Article2' },
              { id: 3, title: 'Article3' },
              { id: 4, title: 'Article4' },
              { id: 5, title: 'Article5' },
              { id: 6, title: 'Article6' },
            ],
          },
        }),
    });

    const articles = await fetchRandomArticles(2);

    expect(articles).toHaveLength(2);
    expect(articles[0]).toEqual({ title: 'Article1', id: 1 });
    expect(articles[1]).toEqual({ title: 'Article2', id: 2 });
  });

  it('slices extra results to match requested count', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          query: {
            random: [
              { id: 1, title: 'A' },
              { id: 2, title: 'B' },
              { id: 3, title: 'C' },
              { id: 4, title: 'D' },
              { id: 5, title: 'E' },
              { id: 6, title: 'F' },
              { id: 7, title: 'G' },
              { id: 8, title: 'H' },
              { id: 9, title: 'I' },
            ],
          },
        }),
    });

    const articles = await fetchRandomArticles(3);

    expect(articles).toHaveLength(3);
    expect(articles.map((a) => a.title)).toEqual(['A', 'B', 'C']);
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
    });

    await expect(fetchRandomArticles(2)).rejects.toThrow(
      'Wikipedia API error: 503 Service Unavailable'
    );
  });
});

describe('clearCache', () => {
  it('clears cached data so subsequent calls re-fetch', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          query: {
            pages: {
              '123': {
                links: [{ title: 'Dog' }],
              },
            },
          },
        }),
    });

    await fetchArticleLinks('Cat');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    clearCache();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          query: {
            pages: {
              '123': {
                links: [{ title: 'Fish' }],
              },
            },
          },
        }),
    });

    const result = await fetchArticleLinks('Cat');
    expect(result).toEqual(['Fish']);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

describe('fetchTopArticles', () => {
  it('returns parsed articles with titles and view counts', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          items: [
            {
              articles: [
                { article: 'Albert_Einstein', views: 50000, rank: 1 },
                { article: 'United_States', views: 40000, rank: 2 },
              ],
            },
          ],
        }),
    });

    const result = await fetchTopArticles(2026, 3, 15);

    expect(result).toEqual([
      { title: 'Albert Einstein', views: 50000 },
      { title: 'United States', views: 40000 },
    ]);
  });

  it('converts underscored titles to spaces', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          items: [
            {
              articles: [
                { article: 'New_York_City', views: 30000, rank: 1 },
              ],
            },
          ],
        }),
    });

    const result = await fetchTopArticles(2026, 1, 1);

    expect(result[0].title).toBe('New York City');
  });

  it('constructs the correct URL with zero-padded month and day', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          items: [{ articles: [] }],
        }),
    });

    await fetchTopArticles(2026, 3, 5);

    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain('/2026/03/05');
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    await expect(fetchTopArticles(2026, 1, 1)).rejects.toThrow(
      'Pageviews API error: 404 Not Found'
    );
  });
});
