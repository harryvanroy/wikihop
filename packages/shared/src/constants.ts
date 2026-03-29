export const ROOM_CODE_LENGTH = 4;
export const MIN_ARTICLE_LINKS = 20;
export const MAX_HOPS_PER_SECOND = 2;
export const COUNTDOWN_SECONDS = 3;
export const ROOM_EXPIRE_FINISHED_MS = 5 * 60 * 1000;

// BFS article selection settings
export const TARGET_DEPTH = 4; // how many hops away the target should be from start
export const RANDOM_ARTICLE_BATCH_SIZE = 10; // how many random articles to fetch per attempt
export const MAX_PAIR_RETRIES = 5; // max attempts to find a valid pair

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

// Title patterns to exclude from article selection
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
