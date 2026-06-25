import { executeTool } from './novaTools.js';

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = 'gemini-2.5-flash';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_TOOL_ROUNDS = 5;

export async function generateResponse(systemPrompt, messages, config = {}) {
  if (!API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const { temperature = 0.7, maxOutputTokens = 1200, tools, userId } = config;

  const contents = messages.map(m => ({
    role: m.role === 'nova' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: { temperature, topP: 0.9, maxOutputTokens },
  };

  if (tools?.length) {
    body.tools = [{ functionDeclarations: tools }];
  }

  const url = `${BASE_URL}/${MODEL}:generateContent?key=${API_KEY}`;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    let res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.status === 429) {
      await new Promise(r => setTimeout(r, 2000));
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Gemini API error: HTTP ${res.status}`);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    if (!candidate?.content?.parts?.length) {
      throw new Error('Empty response from Gemini');
    }

    const parts = candidate.content.parts;
    const functionCall = parts.find(p => p.functionCall);

    if (!functionCall) {
      const text = parts.find(p => p.text)?.text;
      if (!text) throw new Error('No text in Gemini response');
      return text;
    }

    const { name, args } = functionCall.functionCall;
    console.log(`[Nova] Tool call: ${name}(${JSON.stringify(args)})`);

    const result = await executeTool(name, args, userId);
    console.log(`[Nova] Tool result: ${JSON.stringify(result).slice(0, 200)}`);

    body.contents.push({
      role: 'model',
      parts: [{ functionCall: { name, args } }],
    });

    body.contents.push({
      role: 'user',
      parts: [{
        functionResponse: {
          name,
          response: { content: result },
        },
      }],
    });
  }

  throw new Error('Too many tool calls — agent loop exceeded limit');
}
