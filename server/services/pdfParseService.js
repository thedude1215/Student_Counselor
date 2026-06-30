import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL   = 'gemini-2.5-flash';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

const ACTIVITY_TYPES = [
  'Academic', 'Arts', 'Athletics: Club', 'Athletics: JV/Varsity',
  'Career Oriented', 'Community Service', 'Computer / Technology', 'Cultural',
  'Dance', 'Debate / Speech', 'Environmental', 'Family Responsibilities',
  'Journalism / Publication', 'Music: Instrumental', 'Music: Vocal', 'Religious',
  'Research', 'Robotics', 'Science / Math', 'Student Government',
  'Theater / Drama', 'Work (Paid)', 'Other',
];

const EXTRACTION_PROMPT = `You are extracting structured data from a Common App application PDF.

Extract ALL activities and ALL honors/awards from the text below.

ACTIVITY TYPE MAPPING — map Common App types to exactly one of these 23 values:
${ACTIVITY_TYPES.join(', ')}

HONOR LEVEL MAPPING:
- "International" or "World" → "International"
- "National" → "National"
- "State", "Regional", "Region" → "State / Regional"
- "Local", "School", "Institutional" → "School"
- anything else → "Other"

RULES:
- description must be max 150 characters (truncate if longer)
- hours_per_week and weeks_per_year must be integers or null
- If a field is not present in the PDF, use null or ""
- Return ONLY the JSON object — no prose, no markdown, no code fences

Return this exact JSON shape:
{
  "activities": [
    {
      "activity_type": "one of the 23 types above",
      "title": "activity/club/organization name",
      "role": "position or leadership title",
      "organization": "school or org name",
      "description": "what you did and impact (max 150 chars)",
      "hours_per_week": integer or null,
      "weeks_per_year": integer or null
    }
  ],
  "honors": [
    {
      "title": "award or honor name",
      "level": "International | National | State / Regional | School | Other",
      "year": "YYYY or empty string",
      "description": "context (max 150 chars)"
    }
  ]
}

PDF TEXT:
`;

export async function extractTextFromPdf(buffer) {
  const data = await pdfParse(buffer);
  return data.text;
}

export async function parseActivitiesFromText(text) {
  const prompt = EXTRACTION_PROMPT + text.slice(0, 30000); // cap at ~30k chars

  const res = await fetch(
    `${BASE_URL}/${MODEL}:generateContent?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0, responseMimeType: 'application/json' },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.find(p => p.text)?.text;
  if (!raw) throw new Error('Empty response from Gemini');

  // Strip any accidental markdown fences
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const parsed = JSON.parse(cleaned);

  // Sanitize
  const activities = (parsed.activities || []).map(a => ({
    activity_type: ACTIVITY_TYPES.includes(a.activity_type) ? a.activity_type : 'Other',
    title: String(a.title || '').slice(0, 100),
    role: String(a.role || '').slice(0, 100),
    organization: String(a.organization || '').slice(0, 100),
    description: String(a.description || '').slice(0, 150),
    hours_per_week: Number.isFinite(Number(a.hours_per_week)) ? Number(a.hours_per_week) : null,
    weeks_per_year: Number.isFinite(Number(a.weeks_per_year)) ? Number(a.weeks_per_year) : null,
  })).filter(a => a.title);

  const LEVELS = ['International', 'National', 'State / Regional', 'School', 'Other'];
  const honors = (parsed.honors || []).map(h => ({
    title: String(h.title || '').slice(0, 100),
    level: LEVELS.includes(h.level) ? h.level : 'Other',
    year: String(h.year || ''),
    description: String(h.description || '').slice(0, 150),
  })).filter(h => h.title);

  return { activities, honors };
}
