import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { generateResponse } from '../services/aiService.js';
import { toolDeclarations } from '../services/novaTools.js';
import { supabase } from '../lib/supabase.js';
import crypto from 'crypto';

const router = Router();
router.use(requireAuth);

/* ─── Rate limiting (in-memory, per-user) ─── */
const rateLimits = new Map();

function checkRate(userId, bucket, maxPerHour) {
  const key = `${userId}:${bucket}`;
  const now = Date.now();
  const window = rateLimits.get(key) || [];
  const recent = window.filter(t => now - t < 3600_000);
  if (recent.length >= maxPerHour) return false;
  recent.push(now);
  rateLimits.set(key, recent);
  return true;
}

/* ─── System prompts ─── */

const CHAT_SYSTEM_PROMPT = `You are Nova, ScholarPath's AI admissions counselor — built specifically for international high school students applying to universities worldwide.

You are NOT a generic AI assistant. You operate like the world's best human admissions mentor.

CORE BEHAVIORS:
1. UNDERSTAND FIRST — Before giving advice, learn who the student is. Use get_student_profile to pull their data. Ask for what's missing.
2. BE SPECIFIC — No generic advice. Use your tools to look up real data. NEVER guess university stats — search first.
3. BE PROACTIVE — Use search_programs and search_stories to surface opportunities the student didn't know about.
4. REMEMBER CONTEXT — Use everything shared earlier in the conversation.
5. BE HONEST — If something is a reach, say so. Celebrate genuine strengths.
6. BE CONCISE — Use bullet points, headers, and structure.

TOOL USAGE:
- ALWAYS use search_universities when asked about schools. Never rely on memory for stats.
- Use get_student_profile at the start of meaningful conversations to personalize advice.
- Use get_college_list to see what schools they're already considering.
- Use compare_universities when students ask to compare schools.
- Use search_programs when asked about summer programs or competitions.
- Use search_stories to find inspiring examples from similar students.
- Use add_to_college_list when a student wants to add a school to their list.
- Use get_upcoming_tasks to help with deadline planning.

DOMAIN KNOWLEDGE:
- US: Common App, SAT/ACT, AP/IB, CSS Profile, QuestBridge, need-blind vs need-aware
- UK: UCAS, personal statements (4000 chars), A-levels, IB
- Canada: Direct application, grade-based
- Europe: Low/no tuition (ETH, TU Delft), language requirements
- Singapore: NUS, NTU — competitive for internationals
- UAE: NYU Abu Dhabi (full scholarship), MBZUAI
- Scholarships: QuestBridge, Pearson (UofT), need-blind Ivies, Minerva
- Essays: Show don't tell, authenticity > prestige-chasing
- Activities: Depth > breadth, leadership + impact

TONE: Warm, direct, encouraging. You believe every student has a path — your job is to find it.

Start your first message by warmly greeting the student and asking 2-3 key questions to understand their situation.`;

const ESSAY_REVIEW_PROMPT = `You are an expert college admissions essay reviewer. Provide structured, actionable feedback.

FORMAT YOUR RESPONSE AS:
## Overall Impression
(2-3 sentences)

## Strengths
- (bullet points)

## Areas for Improvement
- (bullet points with specific suggestions)

## Line-Specific Suggestions
- (quote specific phrases and suggest improvements)

## Score: X/10

Be specific — reference actual phrases from the essay. Be encouraging but honest.`;

const RECOMMENDATION_PROMPT = `You are a college list advisor for international students. You have tools to search the university catalog. Use search_universities to find matching schools based on the student's profile.

For each recommendation:
1. University name
2. Why it fits this student
3. Tier (Reach/Match/Safety)
4. Key deadline or tip

Use get_student_profile and get_college_list first to understand the student, then search_universities with appropriate filters. Only recommend schools from your search results.`;

/* ─── Chat ─── */

router.post('/chat', async (req, res) => {
  const { conversationId, message } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });
  if (!conversationId) return res.status(400).json({ error: 'conversationId is required' });

  if (!checkRate(req.userId, 'chat', 30)) {
    return res.status(429).json({ error: 'Rate limit reached (30 messages/hour). Please wait.' });
  }

  try {
    const { data: history } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .eq('profile_id', req.userId)
      .order('created_at', { ascending: true })
      .limit(20);

    const messages = [...(history || []), { role: 'user', content: message.trim() }];

    const reply = await generateResponse(CHAT_SYSTEM_PROMPT, messages, {
      temperature: 0.7,
      maxOutputTokens: 1200,
      tools: toolDeclarations,
      userId: req.userId,
    });

    const now = new Date().toISOString();
    await supabase.from('chat_messages').insert([
      { profile_id: req.userId, conversation_id: conversationId, role: 'user', content: message.trim(), created_at: now },
      { profile_id: req.userId, conversation_id: conversationId, role: 'nova', content: reply, created_at: new Date(Date.now() + 1).toISOString() },
    ]);

    res.json({ reply });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate response' });
  }
});

/* ─── Conversations ─── */

router.get('/conversations', async (req, res) => {
  try {
    const { data } = await supabase
      .from('chat_messages')
      .select('conversation_id, content, created_at')
      .eq('profile_id', req.userId)
      .eq('role', 'user')
      .order('created_at', { ascending: false });

    const seen = new Map();
    for (const msg of data || []) {
      if (!seen.has(msg.conversation_id)) {
        seen.set(msg.conversation_id, {
          id: msg.conversation_id,
          title: msg.content.slice(0, 60) + (msg.content.length > 60 ? '...' : ''),
          created_at: msg.created_at,
        });
      }
    }

    res.json({ conversations: [...seen.values()] });
  } catch (err) {
    console.error('List conversations error:', err);
    res.status(500).json({ error: 'Failed to load conversations' });
  }
});

router.post('/conversations', async (req, res) => {
  const id = crypto.randomUUID();
  res.json({ id });
});

router.get('/conversations/:id/messages', async (req, res) => {
  try {
    const { data } = await supabase
      .from('chat_messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', req.params.id)
      .eq('profile_id', req.userId)
      .order('created_at', { ascending: true });

    res.json({ messages: data || [] });
  } catch (err) {
    console.error('Load messages error:', err);
    res.status(500).json({ error: 'Failed to load messages' });
  }
});

router.delete('/conversations/:id', async (req, res) => {
  try {
    await supabase
      .from('chat_messages')
      .delete()
      .eq('conversation_id', req.params.id)
      .eq('profile_id', req.userId);

    res.json({ ok: true });
  } catch (err) {
    console.error('Delete conversation error:', err);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

/* ─── Essay Review ─── */

router.post('/essay-review', async (req, res) => {
  const { essayId, essayContent, essayPrompt, essayTitle } = req.body;
  if (!essayContent?.trim()) return res.status(400).json({ error: 'Essay content is required' });

  if (!checkRate(req.userId, 'essay', 5)) {
    return res.status(429).json({ error: 'Rate limit reached (5 reviews/day). Please wait.' });
  }

  try {
    const contextParts = [];
    if (essayTitle) contextParts.push(`Essay Title: ${essayTitle}`);
    if (essayPrompt) contextParts.push(`Prompt: ${essayPrompt}`);
    contextParts.push(`Word Count: ${essayContent.trim().split(/\s+/).length}`);

    const systemPrompt = ESSAY_REVIEW_PROMPT + '\n\n' + contextParts.join('\n');

    const feedback = await generateResponse(
      systemPrompt,
      [{ role: 'user', content: essayContent.trim() }],
      { temperature: 0.3, maxOutputTokens: 1500, userId: req.userId },
    );

    if (essayId) {
      await supabase
        .from('essays')
        .update({
          ai_feedback: feedback,
          feedback_updated_at: new Date().toISOString(),
        })
        .eq('id', essayId)
        .eq('profile_id', req.userId);
    }

    res.json({ feedback });
  } catch (err) {
    console.error('Essay review error:', err);
    res.status(500).json({ error: err.message || 'Failed to review essay' });
  }
});

/* ─── College Recommendations ─── */

router.post('/recommendations', async (req, res) => {
  if (!checkRate(req.userId, 'recs', 3)) {
    return res.status(429).json({ error: 'Rate limit reached (3 recommendations/day). Please wait.' });
  }

  try {
    const reply = await generateResponse(
      RECOMMENDATION_PROMPT,
      [{ role: 'user', content: 'Based on my profile, recommend schools for me. Use tools to look up my profile and search for matching universities.' }],
      {
        temperature: 0.5,
        maxOutputTokens: 1200,
        tools: toolDeclarations,
        userId: req.userId,
      },
    );

    res.json({ recommendations: reply });
  } catch (err) {
    console.error('Recommendations error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate recommendations' });
  }
});

export default router;
