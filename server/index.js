import cors from 'cors';
import express from 'express';
import catalogRoutes from './routes/catalogRoutes.js';

const app = express();
const port = Number(process.env.PORT || 8787);

app.use(cors());
app.use(express.json());
app.use('/api', catalogRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.originalUrl,
  });
});

app.use((err, _req, res, _next) => {
  void _next;
  console.error(err);
  res.status(500).json({
    error: 'Internal server error',
  });
});

app.listen(port, () => {
  console.log(`ScholarPath API listening on http://localhost:${port}`);
});
