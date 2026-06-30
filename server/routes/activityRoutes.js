import express from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { extractTextFromPdf, parseActivitiesFromText } from '../services/pdfParseService.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter(_req, file, cb) {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Please upload a PDF file'));
    }
  },
});

router.post('/parse-pdf', requireAuth, upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file received' });
    }

    const text = await extractTextFromPdf(req.file.buffer);

    if (!text || text.trim().length < 50) {
      return res.status(422).json({ error: 'Could not read text from this PDF. Try downloading a fresh copy from Common App.' });
    }

    const result = await parseActivitiesFromText(text);
    return res.json(result);
  } catch (err) {
    if (err.message?.includes('Please upload a PDF')) {
      return res.status(400).json({ error: err.message });
    }
    console.error('[PDF parse]', err);
    return res.status(500).json({
      error: 'Could not read this PDF. Try downloading a fresh copy from Common App.',
    });
  }
});

// Multer error handler (file size, wrong type)
router.use((err, _req, res, _next) => {
  void _next;
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large — maximum 10 MB' });
  }
  return res.status(400).json({ error: err.message || 'Upload error' });
});

export default router;
