import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../wikipediaProxy', () => ({
  fetchTopArticles: vi.fn(),
}));

import { fetchTopArticles } from '../wikipediaProxy';
import {
  isExcludedTitle,
  ensurePool,
  pickPopularArticles,
  resetPool,
} from '../popularArticles';

const mockedFetchTopArticles = vi.mocked(fetchTopArticles);

function makeMockArticles(titles: string[], views = 1000): Array<{ title: string; views: number }> {
  return titles.map((title, i) => ({ title, views: views - i }));
}

beforeEach(() => {
  vi.clearAllMocks();
  resetPool();
});

describe('isExcludedTitle', () => {
  it('excludes "Main Page"', () => {
    expect(isExcludedTitle('Main Page')).toBe(true);
  });

  it('excludes "Special:Search"', () => {
    expect(isExcludedTitle('Special:Search')).toBe(true);
  });

  it('excludes "List of ..." titles', () => {
    expect(isExcludedTitle('List of sovereign states')).toBe(true);
  });

  it('excludes "Lists of ..." titles', () => {
    expect(isExcludedTitle('Lists of Americans')).toBe(true);
  });

  it('excludes "Deaths in ..." titles', () => {
    expect(isExcludedTitle('Deaths in 2026')).toBe(true);
  });

  it('excludes bare year titles', () => {
    expect(isExcludedTitle('2026')).toBe(true);
    expect(isExcludedTitle('1999')).toBe(true);
  });

  it('excludes "YYYY in X" titles', () => {
    expect(isExcludedTitle('2026 in music')).toBe(true);
    expect(isExcludedTitle('2025 in film')).toBe(true);
  });

  it('excludes season range titles', () => {
    expect(isExcludedTitle('2025–26 Premier League season')).toBe(true);
  });

  it('excludes date page titles', () => {
    expect(isExcludedTitle('January 15')).toBe(true);
    expect(isExcludedTitle('March 2026')).toBe(true);
    expect(isExcludedTitle('December 1')).toBe(true);
  });

  it('excludes disambiguation pages', () => {
    expect(isExcludedTitle('Cat (disambiguation)')).toBe(true);
  });

  it('excludes namespace-prefixed titles', () => {
    expect(isExcludedTitle('Wikipedia:About')).toBe(true);
    expect(isExcludedTitle('File:Example.jpg')).toBe(true);
    expect(isExcludedTitle('Template:Infobox')).toBe(true);
  });

  it('allows normal article titles', () => {
    expect(isExcludedTitle('Albert Einstein')).toBe(false);
    expect(isExcludedTitle('United States')).toBe(false);
    expect(isExcludedTitle('The Beatles')).toBe(false);
  });

  it('allows "YYYY" titles that are not bare years', () => {
    expect(isExcludedTitle('2026 FIFA World Cup')).toBe(false);
  });
});

describe('ensurePool', () => {
  const goodArticles = makeMockArticles(
    Array.from({ length: 60 }, (_, i) => `Article ${i}`),
    5000
  );

  it('returns filtered articles when API succeeds', async () => {
    mockedFetchTopArticles.mockResolvedValue(goodArticles);

    const articles = await ensurePool();

    expect(articles.length).toBeGreaterThan(0);
    expect(mockedFetchTopArticles).toHaveBeenCalledTimes(3); // 3 days
  });

  it('filters out excluded titles from the pool', async () => {
    mockedFetchTopArticles.mockResolvedValue([
      { title: 'Albert Einstein', views: 5000 },
      { title: 'Main Page', views: 100000 },
      { title: 'List of countries', views: 3000 },
      { title: '2026', views: 2000 },
      { title: 'The Beatles', views: 4000 },
    ]);

    const articles = await ensurePool();

    expect(articles).toContain('Albert Einstein');
    expect(articles).toContain('The Beatles');
    expect(articles).not.toContain('Main Page');
    expect(articles).not.toContain('List of countries');
    expect(articles).not.toContain('2026');
  });

  it('deduplicates articles appearing on multiple days by aggregating views', async () => {
    mockedFetchTopArticles
      .mockResolvedValueOnce([{ title: 'Albert Einstein', views: 5000 }])
      .mockResolvedValueOnce([{ title: 'Albert Einstein', views: 3000 }])
      .mockResolvedValueOnce([{ title: 'Albert Einstein', views: 2000 }]);

    const articles = await ensurePool();

    // Should appear only once despite being in all 3 days
    expect(articles.filter((a) => a === 'Albert Einstein')).toHaveLength(1);
  });

  it('handles partial API failures gracefully', async () => {
    mockedFetchTopArticles
      .mockResolvedValueOnce(goodArticles)
      .mockRejectedValueOnce(new Error('API down'))
      .mockResolvedValueOnce(goodArticles);

    const articles = await ensurePool();

    expect(articles.length).toBeGreaterThan(0);
  });

  it('does not re-fetch if pool is fresh', async () => {
    mockedFetchTopArticles.mockResolvedValue(goodArticles);

    await ensurePool();
    await ensurePool();

    // Only 3 calls (one per day), not 6
    expect(mockedFetchTopArticles).toHaveBeenCalledTimes(3);
  });

  it('returns empty array if all API calls fail and no existing pool', async () => {
    mockedFetchTopArticles.mockRejectedValue(new Error('All down'));

    const articles = await ensurePool();

    // Pool has 0 articles but still gets set (warning logged)
    expect(articles).toEqual([]);
  });
});

describe('pickPopularArticles', () => {
  beforeEach(() => {
    mockedFetchTopArticles.mockResolvedValue(
      makeMockArticles(
        Array.from({ length: 60 }, (_, i) => `Article ${i}`),
        5000
      )
    );
  });

  it('returns exactly the requested count of unique articles', async () => {
    const result = await pickPopularArticles(2);

    expect(result).toHaveLength(2);
    expect(result[0].title).not.toBe(result[1].title);
  });

  it('returns objects with title property', async () => {
    const result = await pickPopularArticles(1);

    expect(result[0]).toHaveProperty('title');
    expect(typeof result[0].title).toBe('string');
  });

  it('returns empty array when pool has fewer articles than requested', async () => {
    mockedFetchTopArticles.mockResolvedValue([
      { title: 'Only One', views: 100 },
    ]);
    resetPool();

    const result = await pickPopularArticles(5);

    expect(result).toEqual([]);
  });
});
