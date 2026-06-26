import { executeTool } from './novaTools.js';

const API_KEY = process.env.GEMINI_API_KEY;
const MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_TOOL_ROUNDS = 5;
const MAX_RETRIES = 3;
const RETRY_DELAYS = [2000, 4000, 8000];

async function fetchWithRetry(url, options) {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const res = await fetch(url, options);

    if (res.ok) return res;

    if (res.status === 429 || res.status === 503) {
      console.log(`[Nova] ${res.status} on attempt ${attempt + 1}, retrying in ${RETRY_DELAYS[attempt]}ms...`);
      await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]));
      continue;
    }

    return res;
  }
  return fetch(url, options);
}

function extractResponse(data) {
  const candidate = data.candidates?.[0];

  if (!candidate) {
    const blockReason = data.promptFeedback?.blockReason;
    if (blockReason) throw new Error(`Prompt blocked: ${blockReason}`);
    throw new Error('No candidates in Gemini response');
  }

  if (candidate.finishReason === 'SAFETY') {
    throw new Error('Response blocked by safety filters');
  }

  const parts = candidate.content?.parts;
  if (!parts?.length) {
    throw new Error(`Empty response (finishReason: ${candidate.finishReason || 'unknown'})`);
  }

  const functionCall = parts.find(p => p.functionCall);
  if (functionCall) {
    return { type: 'functionCall', functionCall: functionCall.functionCall, parts };
  }

  // Gemini 2.5 "thinking" models can return thought parts alongside text
  const textPart = parts.find(p => p.text !== undefined && p.text !== null);
  if (textPart) {
    return { type: 'text', text: textPart.text };
  }

  // If only thought parts exist with no text, treat as empty
  const thoughtPart = parts.find(p => p.thought);
  if (thoughtPart) {
    throw new Error('Model returned only thinking with no response text — try again');
  }

  throw new Error('No usable content in Gemini response');
}

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

  let lastError;

  for (const model of MODELS) {
    const url = `${BASE_URL}/${model}:generateContent?key=${API_KEY}`;
    const bodyCopy = JSON.parse(JSON.stringify(body));

    try {
      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const res = await fetchWithRetry(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyCopy),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error?.message || `Gemini API error: HTTP ${res.status}`);
        }

        const data = await res.json();
        const result = extractResponse(data);

        if (result.type === 'text') {
          return result.text;
        }

        // Function call — execute and loop
        const { name, args } = result.functionCall;
        console.log(`[Nova] Tool call: ${name}(${JSON.stringify(args)})`);

        const toolResult = await executeTool(name, args, userId);
        console.log(`[Nova] Tool result: ${JSON.stringify(toolResult).slice(0, 200)}`);

        bodyCopy.contents.push({
          role: 'model',
          parts: result.parts,
        });

        bodyCopy.contents.push({
          role: 'user',
          parts: [{
            functionResponse: {
              name,
              response: { content: toolResult },
            },
          }],
        });
      }

      throw new Error('Too many tool calls — agent loop exceeded limit');
    } catch (err) {
      console.log(`[Nova] Model ${model} failed: ${err.message}`);
      lastError = err;
      if (model !== MODELS[MODELS.length - 1]) {
        console.log(`[Nova] Falling back to next model...`);
      }
    }
  }

  throw lastError;
}
