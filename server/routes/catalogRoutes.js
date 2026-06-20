import { Router } from 'express';
import {
  findAcceptances,
  findPrograms,
  findStories,
  findUniversities,
  getHomeContent,
} from '../repositories/catalogRepository.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'scholarpath-api' });
});

router.get('/home', (_req, res) => {
  res.json(getHomeContent());
});

router.get('/universities', (req, res) => {
  res.json({ items: findUniversities(req.query) });
});

router.get('/programs', (req, res) => {
  res.json({ items: findPrograms(req.query) });
});

router.get('/stories', (req, res) => {
  res.json({ items: findStories(req.query) });
});

router.get('/acceptances', (req, res) => {
  res.json({ items: findAcceptances(req.query) });
});

export default router;
