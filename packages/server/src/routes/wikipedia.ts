import { Router } from 'express';
import { fetchArticle, fetchRandomArticles } from '../services/wikipediaProxy';

export const wikipediaRouter = Router();

wikipediaRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

wikipediaRouter.get('/random', async (_req, res) => {
  try {
    const articles = await fetchRandomArticles(2);
    res.json({ articles });
  } catch (err) {
    console.error('Failed to fetch random articles:', err);
    res.status(502).json({ error: 'Failed to fetch from Wikipedia' });
  }
});

wikipediaRouter.get('/:title', async (req, res) => {
  try {
    const { title } = req.params;
    const fields = (req.query.fields as string)?.split(',') || ['html', 'links'];
    const article = await fetchArticle(decodeURIComponent(title), fields);
    res.json(article);
  } catch (err) {
    console.error(`Failed to fetch article "${req.params.title}":`, err);
    res.status(502).json({ error: 'Failed to fetch from Wikipedia' });
  }
});
