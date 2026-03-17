import { useEffect, useState } from 'react';
import { sanitizeWikiHtml } from '../utils/sanitize';
import { fetchArticle } from '../services/wikipedia';
import { BLOCKED_NAMESPACES } from '@wikihop/shared';
import '../styles/article.css';

interface ArticleViewProps {
  title: string;
  onHop: (toArticle: string) => void;
}

export default function ArticleView({ title, onHop }: ArticleViewProps) {
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    fetchArticle(title, controller.signal)
      .then((article) => {
        if (article.html) {
          setHtml(sanitizeWikiHtml(article.html));
        }
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [title]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest('a');
    if (!anchor) return;
    e.preventDefault();

    const href = anchor.getAttribute('href') || '';
    const match = href.match(/^\/wiki\/([^#]+)/);
    if (!match) return;

    const articleTitle = decodeURIComponent(match[1].replace(/_/g, ' '));

    // Block special namespaces
    if (BLOCKED_NAMESPACES.some((ns) => articleTitle.startsWith(ns))) {
      return;
    }

    onHop(articleTitle);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
        Failed to load article: {error}
      </div>
    );
  }

  return (
    <div
      className="wiki-article"
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
