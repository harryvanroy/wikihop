export const ROOM_CODE_LENGTH = 4;
export const MIN_ARTICLE_LINKS = 10;
export const MAX_HOPS_PER_SECOND = 2;
export const COUNTDOWN_SECONDS = 3;
export const ROOM_EXPIRE_FINISHED_MS = 5 * 60 * 1000;

export const BLOCKED_NAMESPACES = [
  'File:',
  'Template:',
  'Category:',
  'Wikipedia:',
  'Help:',
  'Portal:',
  'Special:',
  'Talk:',
  'User:',
  'Module:',
  'MediaWiki:',
  'Draft:',
];

// Popular article pool settings
export const POPULAR_ARTICLES_REFRESH_MS = 24 * 60 * 60 * 1000; // 24 hours
export const POPULAR_ARTICLES_MIN_POOL_SIZE = 50;
export const POPULAR_ARTICLES_FETCH_DAYS = 3;

// Title patterns to exclude from the popular articles pool
export const EXCLUDED_TITLE_PREFIXES = [
  'List of ',
  'Lists of ',
  'Deaths in ',
  ...BLOCKED_NAMESPACES,
];

export const EXCLUDED_TITLE_PATTERNS = [
  /^\d{4}$/, // bare years like "2026"
  /^\d{4} in /, // "2026 in music"
  /^\d{4}–\d{2}/, // "2025–26 Premier League season"
  /^(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}$/, // date pages
  /^(January|February|March|April|May|June|July|August|September|October|November|December) \d{4}$/, // month+year
  /\(disambiguation\)$/i,
  /^Main Page$/,
  /^Special:Search$/,
];
