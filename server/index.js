import app from './app.js';
import './services/reminderCron.js';

const port = Number(process.env.PORT || 8787);

app.listen(port, () => {
  console.log(`ScholarPath API listening on http://localhost:${port}`);
});
