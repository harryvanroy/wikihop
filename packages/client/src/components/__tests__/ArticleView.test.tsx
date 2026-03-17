import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ArticleView from '../ArticleView';
import { fetchArticle } from '../../services/wikipedia';

vi.mock('../../services/wikipedia', () => ({
  fetchArticle: vi.fn(),
}));

vi.mock('../../utils/sanitize', () => ({
  sanitizeWikiHtml: (html: string) => html,
}));

vi.mock('../../styles/article.css', () => ({}));

const mockFetchArticle = vi.mocked(fetchArticle);

describe('ArticleView', () => {
  const defaultProps = {
    title: 'Cat',
    onHop: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner initially', () => {
    mockFetchArticle.mockReturnValue(new Promise(() => {})); // never resolves
    const { container } = render(<ArticleView {...defaultProps} />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders article HTML after fetch completes', async () => {
    mockFetchArticle.mockResolvedValue({
      html: '<p>Cats are small domesticated mammals.</p>',
    });
    render(<ArticleView {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Cats are small domesticated mammals.')).toBeInTheDocument();
    });
  });

  it('shows error message when fetch fails', async () => {
    mockFetchArticle.mockRejectedValue(new Error('Network error'));
    render(<ArticleView {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/Failed to load article/)).toBeInTheDocument();
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });
  });

  it('calls onHop with decoded article title when clicking a /wiki/ link', async () => {
    const onHop = vi.fn();
    mockFetchArticle.mockResolvedValue({
      html: '<a href="/wiki/Dog">Dog</a>',
    });
    render(<ArticleView title="Cat" onHop={onHop} />);
    await waitFor(() => {
      expect(screen.getByText('Dog')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Dog'));
    expect(onHop).toHaveBeenCalledWith('Dog');
  });

  it('decodes article titles with underscores and encoded characters', async () => {
    const onHop = vi.fn();
    mockFetchArticle.mockResolvedValue({
      html: '<a href="/wiki/New_York_City">NYC</a>',
    });
    render(<ArticleView title="Cat" onHop={onHop} />);
    await waitFor(() => {
      expect(screen.getByText('NYC')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('NYC'));
    expect(onHop).toHaveBeenCalledWith('New York City');
  });

  it('does NOT call onHop for blocked namespace links (File:)', async () => {
    const onHop = vi.fn();
    mockFetchArticle.mockResolvedValue({
      html: '<a href="/wiki/File:Photo.jpg">Photo</a>',
    });
    render(<ArticleView title="Cat" onHop={onHop} />);
    await waitFor(() => {
      expect(screen.getByText('Photo')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Photo'));
    expect(onHop).not.toHaveBeenCalled();
  });

  it('does NOT call onHop for blocked namespace links (Template:)', async () => {
    const onHop = vi.fn();
    mockFetchArticle.mockResolvedValue({
      html: '<a href="/wiki/Template:Foo">Template</a>',
    });
    render(<ArticleView title="Cat" onHop={onHop} />);
    await waitFor(() => {
      expect(screen.getByText('Template')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Template'));
    expect(onHop).not.toHaveBeenCalled();
  });

  it('does NOT call onHop for non-wiki links', async () => {
    const onHop = vi.fn();
    mockFetchArticle.mockResolvedValue({
      html: '<a href="https://example.com">External</a>',
    });
    render(<ArticleView title="Cat" onHop={onHop} />);
    await waitFor(() => {
      expect(screen.getByText('External')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('External'));
    expect(onHop).not.toHaveBeenCalled();
  });

  it('re-fetches when title prop changes', async () => {
    mockFetchArticle
      .mockResolvedValueOnce({ html: '<p>Cat article</p>' })
      .mockResolvedValueOnce({ html: '<p>Dog article</p>' });

    const { rerender } = render(<ArticleView title="Cat" onHop={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText('Cat article')).toBeInTheDocument();
    });
    expect(mockFetchArticle).toHaveBeenCalledWith('Cat', expect.any(AbortSignal));

    rerender(<ArticleView title="Dog" onHop={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText('Dog article')).toBeInTheDocument();
    });
    expect(mockFetchArticle).toHaveBeenCalledWith('Dog', expect.any(AbortSignal));
    expect(mockFetchArticle).toHaveBeenCalledTimes(2);
  });
});
