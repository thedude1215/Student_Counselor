import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';
import crypto from 'crypto';

const router = Router();
router.use(requireAuth);

const NOVA_AGENT_URL = process.env.NOVA_AGENT_URL || 'http://localhost:8000';

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

/* ─── Proxy helper ─── */

async function proxyToAgent(path, body, timeoutMs = 60_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let agentRes;
  try {
    agentRes = await fetch(`${NOVA_AGENT_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (fetchErr) {
    clearTimeout(timer);
    if (fetchErr.name === 'AbortError') {
      console.error(`[Nova] Timeout after ${timeoutMs}ms calling ${path}`);
      const err = new Error(`Nova agent timed out after ${timeoutMs / 1000}s`);
      err.status = 504;
      throw err;
    }
    console.error(`[Nova] Cannot reach nova-agent at ${NOVA_AGENT_URL}${path}:`, fetchErr.message);
    const err = new Error('Nova agent is not running. Start it with: cd nova-agent && .venv/bin/uvicorn app.main:app --port 8000');
    err.status = 503;
    throw err;
  }
  clearTimeout(timer);

  if (!agentRes.ok) {
    const rawText = await agentRes.text().catch(() => '');
    let parsed = {};
    try { parsed = JSON.parse(rawText); } catch { /* non-JSON body */ }

    const message = parsed.detail || parsed.error || `Nova agent error: HTTP ${agentRes.status}`;
    console.error(`[Nova] Agent returned ${agentRes.status} for ${path}:`, rawText.slice(0, 500));
    const error = new Error(message);
    error.status = agentRes.status;
    throw error;
  }

  return agentRes.json();
}

/* ─── Chat ─── */

router.post('/chat', async (req, res) => {
  const { conversationId, message } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });
  if (!conversationId) return res.status(400).json({ error: 'conversationId is required' });

  if (!checkRate(req.userId, 'chat', 30)) {
    return res.status(429).json({ error: 'Rate limit reached (30 messages/hour). Please wait.' });
  }

  try {
    const data = await proxyToAgent('/api/chat', {
      user_id: req.userId,
      conversation_id: conversationId,
      messages: [{ role: 'user', content: message.trim() }],
    });

    res.json({ reply: data.reply });
  } catch (err) {
    console.error('[Nova] /chat error:', err.message, '| status:', err.status, '| stack:', err.stack);
    const status = err.status || 503;
    res.status(status).json({ error: err.message || 'Failed to generate response.' });
  }
});

/* ─── Chat (streaming) ─── */

router.post('/chat/stream', async (req, res) => {
  const { conversationId, message } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });
  if (!conversationId) return res.status(400).json({ error: 'conversationId is required' });

  if (!checkRate(req.userId, 'chat', 30)) {
    return res.status(429).json({ error: 'Rate limit reached (30 messages/hour). Please wait.' });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);
  req.on('close', () => {
    if (!res.writableEnded) controller.abort();
  });

  try {
    let agentRes;
    try {
      agentRes = await fetch(`${NOVA_AGENT_URL}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: req.userId,
          conversation_id: conversationId,
          messages: [{ role: 'user', content: message.trim() }],
        }),
        signal: controller.signal,
      });
    } catch (fetchErr) {
      clearTimeout(timer);
      if (fetchErr.name === 'AbortError') {
        if (req.destroyed) return;
        console.error('[Nova] /chat/stream: timeout waiting for nova-agent');
        return res.status(504).json({ error: 'Nova agent timed out.' });
      }
      console.error('[Nova] /chat/stream: cannot reach nova-agent:', fetchErr.message);
      return res.status(503).json({ error: 'Nova agent is not running. Start it with: cd nova-agent && .venv/bin/uvicorn app.main:app --port 8000' });
    }

    if (!agentRes.ok) {
      clearTimeout(timer);
      const rawText = await agentRes.text().catch(() => '');
      let parsed = {};
      try { parsed = JSON.parse(rawText); } catch { /* non-JSON */ }
      const detail = parsed.detail || parsed.error || rawText.slice(0, 200) || 'Streaming failed';
      console.error(`[Nova] /chat/stream: agent returned ${agentRes.status}:`, detail);
      return res.status(agentRes.status).json({ error: detail });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const reader = agentRes.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
    }

    clearTimeout(timer);
    res.end();
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError' && req.destroyed) return;
    console.error('[Nova] /chat/stream unexpected error:', err.message, '| stack:', err.stack);
    if (!res.headersSent) {
      res.status(503).json({ error: err.message || 'Nova agent is not available.' });
    } else {
      res.end();
    }
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
  const { essayId, essayContent, essayPrompt, essayTitle, universityName } = req.body;
  if (!essayContent?.trim()) return res.status(400).json({ error: 'Essay content is required' });

  if (!checkRate(req.userId, 'essay', 5)) {
    return res.status(429).json({ error: 'Rate limit reached (5 reviews/day). Please wait.' });
  }

  try {
    const data = await proxyToAgent('/api/essay-review', {
      user_id: req.userId,
      essay_content: essayContent.trim(),
      essay_title: essayTitle || null,
      essay_prompt: essayPrompt || null,
      university_name: universityName || null,
    });

    // Structured review: { overall, score, strengths[], strength_annotations[], corrections[], suggestions[] }.
    const review = {
      overall: data.overall || '',
      score: data.score || 0,
      strengths: data.strengths || [],
      strength_annotations: data.strength_annotations || [],
      corrections: data.corrections || [],
      suggestions: data.suggestions || [],
      feedback: data.feedback || '',
    };

    if (essayId) {
      await supabase
        .from('essays')
        .update({
          ai_feedback: JSON.stringify(review),
          feedback_updated_at: new Date().toISOString(),
        })
        .eq('id', essayId)
        .eq('profile_id', req.userId);
    }

    res.json({ review });
  } catch (err) {
    console.error('Essay review error:', err);
    const status = err.status || 503;
    res.status(status).json({ error: err.message || 'Failed to review essay' });
  }
});

/* ─── College Recommendations ─── */

router.post('/recommendations', async (req, res) => {
  if (!checkRate(req.userId, 'recs', 3)) {
    return res.status(429).json({ error: 'Rate limit reached (3 recommendations/day). Please wait.' });
  }

  try {
    const data = await proxyToAgent('/api/chat', {
      user_id: req.userId,
      messages: [{
        role: 'user',
        content: 'Based on my profile, recommend schools for me. Use tools to look up my profile and search for matching universities.',
      }],
    });

    res.json({ recommendations: data.reply });
  } catch (err) {
    console.error('Recommendations error:', err);
    const status = err.status || 503;
    res.status(status).json({ error: err.message || 'Failed to generate recommendations' });
  }
});

/* ─── University Suggestions (structured, tiered) ─── */

router.post('/university-suggestions', async (req, res) => {
  if (!checkRate(req.userId, 'uni-suggest', 3)) {
    return res.status(429).json({ error: 'Rate limit reached (3 suggestion runs/day). Please wait.' });
  }

  try {
    const data = await proxyToAgent('/api/university-suggestions', {
      user_id: req.userId,
    }, 90_000);

    res.json({
      suggestions: data.suggestions || [],
      missing_info: data.missing_info || [],
      list_analysis: data.list_analysis || null,
    });
  } catch (err) {
    console.error('[Nova] /university-suggestions error:', err.message, '| status:', err.status);
    const status = err.status || 503;
    res.status(status).json({ error: err.message || 'Failed to generate suggestions' });
  }
});

/* ─── Scholarship Matches (LLM-ranked, cached) ─── */

// Hash of the profile fields the ranking depends on. When any change, the cache
// is stale and we recompute — this is the "auto-refresh on profile change".
async function computeProfileFingerprint(userId) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('gpa, sat_score, act_score, country, budget, intended_major, target_countries, interests')
    .eq('id', userId)
    .single();

  const { count: actCount } = await supabase
    .from('activities')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', userId);
  const { count: honCount } = await supabase
    .from('honors')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', userId);

  const basis = JSON.stringify({
    gpa: profile?.gpa || null,
    sat: profile?.sat_score || null,
    act: profile?.act_score || null,
    country: profile?.country || null,
    budget: profile?.budget || null,
    major: profile?.intended_major || null,
    targets: (profile?.target_countries || []).slice().sort(),
    interests: (profile?.interests || []).slice().sort(),
    acts: actCount || 0,
    hons: honCount || 0,
  });
  return crypto.createHash('sha256').update(basis).digest('hex').slice(0, 32);
}

router.post('/scholarship-matches', async (req, res) => {
  const force = !!req.body?.force;

  try {
    const fingerprint = await computeProfileFingerprint(req.userId);

    // Cache hit: every stored row must match the current fingerprint (fresh).
    if (!force) {
      const { data: cached } = await supabase
        .from('scholarship_matches')
        .select('scholarship_id, match_score, tier, rationale, why_fits, eligible, profile_fingerprint')
        .eq('profile_id', req.userId);

      if (cached && cached.length && cached.every(r => r.profile_fingerprint === fingerprint)) {
        return res.json({
          matches: cached
            .filter(r => r.eligible)
            .map(r => ({
              scholarship_id: r.scholarship_id,
              match_score: r.match_score,
              tier: r.tier,
              rationale: r.rationale,
              why_fits: r.why_fits,
            }))
            .sort((a, b) => b.match_score - a.match_score),
          ineligible_ids: cached.filter(r => !r.eligible).map(r => r.scholarship_id),
          missing_info: [],
          cached: true,
        });
      }
    }

    // Only real LLM computations count against the rate limit (cache hits are free).
    if (!checkRate(req.userId, 'sch-match', 5)) {
      return res.status(429).json({ error: 'Rate limit reached (5 re-ranks/hour). Please wait.' });
    }

    const data = await proxyToAgent('/api/scholarship-matches', { user_id: req.userId }, 90_000);
    const matches = data.matches || [];
    const ineligible = data.ineligible_ids || [];
    const missing = data.missing_info || [];

    // Profile too thin — agent returned guidance, nothing to cache.
    if (!matches.length && missing.length) {
      return res.json({ matches: [], ineligible_ids: ineligible, missing_info: missing });
    }

    // Refresh the cache with this computation.
    await supabase.from('scholarship_matches').delete().eq('profile_id', req.userId);
    const rows = [
      ...matches.map(m => ({
        profile_id: req.userId,
        scholarship_id: m.scholarship_id,
        match_score: m.match_score,
        tier: m.tier,
        rationale: m.rationale,
        why_fits: m.why_fits,
        eligible: true,
        profile_fingerprint: fingerprint,
      })),
      ...ineligible.map(id => ({
        profile_id: req.userId,
        scholarship_id: id,
        eligible: false,
        profile_fingerprint: fingerprint,
      })),
    ];
    if (rows.length) {
      const { error } = await supabase.from('scholarship_matches').insert(rows);
      if (error) console.error('[Nova] scholarship_matches cache insert error:', error.message);
    }

    res.json({ matches, ineligible_ids: ineligible, missing_info: missing, cached: false });
  } catch (err) {
    console.error('[Nova] /scholarship-matches error:', err.message, '| status:', err.status);
    const status = err.status || 503;
    res.status(status).json({ error: err.message || 'Failed to rank scholarships' });
  }
});

/* ─── Activity Review ─── */

router.post('/activity-review', async (req, res) => {
  const { activityTitle, activityType, role, description, hoursPerWeek, weeksPerYear } = req.body;
  if (!description?.trim()) return res.status(400).json({ error: 'Activity description is required' });
  if (!activityTitle?.trim()) return res.status(400).json({ error: 'Activity title is required' });

  if (!checkRate(req.userId, 'activity-review', 10)) {
    return res.status(429).json({ error: 'Rate limit reached (10 activity reviews/hour). Please wait.' });
  }

  try {
    const data = await proxyToAgent('/api/activity-review', {
      user_id: req.userId,
      activity_title: activityTitle.trim(),
      activity_type: activityType || null,
      role: role || null,
      description: description.trim(),
      hours_per_week: hoursPerWeek || null,
      weeks_per_year: weeksPerYear || null,
    });

    res.json({
      rating: data.rating || 'good',
      feedback: data.feedback || '',
      rewrite_example: data.rewrite_example || '',
    });
  } catch (err) {
    console.error('[Nova] /activity-review error:', err.message, '| status:', err.status);
    const status = err.status || 503;
    res.status(status).json({ error: err.message || 'Failed to review activity' });
  }
});

/* ─── Task Suggestions ─── */

router.post('/suggest-tasks', async (req, res) => {
  const { universityId, universityName } = req.body;
  if (!universityName?.trim()) return res.status(400).json({ error: 'universityName is required' });

  try {
    // Cache: if we already generated suggestions for this (user, university),
    // return the still-pending ones without re-calling the LLM.
    if (universityId) {
      const { data: existing } = await supabase
        .from('task_suggestions')
        .select('*')
        .eq('profile_id', req.userId)
        .eq('university_id', universityId);

      if (existing && existing.length) {
        return res.json({ suggestions: existing.filter(s => s.status === 'suggested') });
      }
    }

    if (!checkRate(req.userId, 'suggest', 15)) {
      return res.status(429).json({ error: 'Rate limit reached (15 suggestion sets/hour). Please wait.' });
    }

    const data = await proxyToAgent('/api/tasks/suggest', {
      user_id: req.userId,
      university_id: universityId || null,
      university_name: universityName.trim(),
    });

    const generated = data.suggestions || [];
    if (!generated.length) {
      return res.json({ suggestions: [] });
    }

    const rows = generated.map(s => ({
      profile_id: req.userId,
      university_id: universityId || null,
      title: s.title,
      category: s.category || null,
      priority: s.priority || 'medium',
      status: 'suggested',
    }));

    const { data: inserted, error } = await supabase
      .from('task_suggestions')
      .insert(rows)
      .select('*');
    if (error) throw error;

    res.json({ suggestions: inserted });
  } catch (err) {
    console.error('[Nova] /suggest-tasks error:', err.message, '| status:', err.status);
    const status = err.status || 503;
    res.status(status).json({ error: err.message || 'Failed to suggest tasks' });
  }
});

export default router;
