import { supabase } from '../lib/supabase.js';

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
}

async function novaFetch(path, options = {}) {
  const token = await getToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`/api/nova${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export function sendMessage(conversationId, message) {
  return novaFetch('/chat', {
    method: 'POST',
    body: JSON.stringify({ conversationId, message }),
  });
}

export async function sendMessageStream(conversationId, message, { onText, onToolCall, onDone, onError }) {
  const token = await getToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch('/api/nova/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ conversationId, message }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    let eventType = '';
    for (const line of lines) {
      if (line.startsWith('event: ')) {
        eventType = line.slice(7).trim();
      } else if (line.startsWith('data: ') && eventType) {
        try {
          const data = JSON.parse(line.slice(6));
          if (eventType === 'text' && onText) onText(data.content);
          else if (eventType === 'tool_call' && onToolCall) onToolCall(data.name);
          else if (eventType === 'done' && onDone) onDone(data);
          else if (eventType === 'error' && onError) onError(new Error(data.error || 'Stream error'));
        } catch { /* skip malformed */ }
        eventType = '';
      } else if (line === '') {
        eventType = '';
      }
    }
  }
}

export function listConversations() {
  return novaFetch('/conversations');
}

export function createConversation() {
  return novaFetch('/conversations', { method: 'POST' });
}

export function loadMessages(conversationId) {
  return novaFetch(`/conversations/${conversationId}/messages`);
}

export function deleteConversation(conversationId) {
  return novaFetch(`/conversations/${conversationId}`, { method: 'DELETE' });
}

export function reviewEssay({ essayId, essayContent, essayPrompt, essayTitle }) {
  return novaFetch('/essay-review', {
    method: 'POST',
    body: JSON.stringify({ essayId, essayContent, essayPrompt, essayTitle }),
  });
}

export function getRecommendations() {
  return novaFetch('/recommendations', { method: 'POST' });
}

export function suggestTasks(universityId, universityName) {
  return novaFetch('/suggest-tasks', {
    method: 'POST',
    body: JSON.stringify({ universityId, universityName }),
  });
}
