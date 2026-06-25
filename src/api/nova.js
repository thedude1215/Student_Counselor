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
