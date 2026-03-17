import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
  'p', 'a', 'b', 'i', 'em', 'strong', 'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'table', 'tr', 'td', 'th', 'thead', 'tbody',
  'div', 'span', 'img', 'br', 'hr',
  'sup', 'sub', 'blockquote', 'pre', 'code',
  'dl', 'dt', 'dd', 'figure', 'figcaption',
];

const ALLOWED_ATTR = [
  'href', 'src', 'alt', 'title', 'class', 'id',
  'colspan', 'rowspan', 'loading',
];

// CSS classes to remove (Wikipedia chrome)
const REMOVE_CLASSES = [
  'mw-editsection',
  'reference',
  'reflist',
  'navbox',
  'sidebar',
  'ambox',
  'mbox',
  'metadata',
  'noprint',
  'mw-empty-elt',
  'sistersitebox',
  'portal',
  'authority-control',
];

export function sanitizeWikiHtml(html: string): string {
  // First, remove elements with unwanted classes before DOMPurify processes them
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Remove unwanted elements by class
  for (const cls of REMOVE_CLASSES) {
    const elements = doc.querySelectorAll(`.${cls}`);
    elements.forEach((el) => el.remove());
  }

  // Remove external links (keep only /wiki/ links)
  const allLinks = doc.querySelectorAll('a');
  allLinks.forEach((a) => {
    const href = a.getAttribute('href') || '';
    if (href && !href.startsWith('/wiki/') && !href.startsWith('#')) {
      // Replace external links with their text content
      const text = document.createTextNode(a.textContent || '');
      a.replaceWith(text);
    }
  });

  // Add lazy loading to images
  const images = doc.querySelectorAll('img');
  images.forEach((img) => img.setAttribute('loading', 'lazy'));

  const cleaned = doc.body.innerHTML;

  return DOMPurify.sanitize(cleaned, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}
