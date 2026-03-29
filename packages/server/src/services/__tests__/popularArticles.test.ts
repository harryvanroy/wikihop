import { describe, it, expect } from 'vitest';

import { isExcludedTitle } from '../popularArticles';

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
