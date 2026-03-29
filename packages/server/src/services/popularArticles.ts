import {
  EXCLUDED_TITLE_PREFIXES,
  EXCLUDED_TITLE_PATTERNS,
} from '@wikihop/shared';

/**
 * Check if a title should be excluded from article selection.
 */
export function isExcludedTitle(title: string): boolean {
  for (const prefix of EXCLUDED_TITLE_PREFIXES) {
    if (title.startsWith(prefix)) return true;
  }
  for (const pattern of EXCLUDED_TITLE_PATTERNS) {
    if (pattern.test(title)) return true;
  }
  return false;
}
