export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export type DocumentItem = { id: string; filename: string; chunks: number; created_at: string };
export type Source = { n: number; filename: string; page: number | null; snippet: string };
export type ChatMessage = { role: 'user' | 'assistant'; content: string; sources?: Source[] };

const TOKEN_KEY = 'documind_token';
export const getToken = () =>
  typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(init.body && !(init.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message ?? body.detail ?? `Request failed (${res.status})`);
  return body as T;
}

export const auth = (mode: 'login' | 'register', email: string, password: string) =>
  request<{ accessToken: string }>(`/auth/${mode}`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

export const listDocuments = () => request<DocumentItem[]>('/documents');
export const deleteDocument = (id: string) =>
  request<{ deleted: boolean }>(`/documents/${id}`, { method: 'DELETE' });
export const uploadDocument = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return request<{ id: string; filename: string; chunks: number }>('/documents/upload', {
    method: 'POST',
    body: form,
  });
};

/** Streams an answer. Calls onSources once, then onToken for each token. */
export async function streamChat(
  question: string,
  history: { role: string; content: string }[],
  handlers: { onSources: (s: Source[]) => void; onToken: (t: string) => void },
  signal?: AbortSignal,
) {
  const res = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify({ question, history }),
  });
  if (!res.ok || !res.body) throw new Error(`Chat failed (${res.status})`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';
    for (const raw of events) {
      const event = /^event: (.+)$/m.exec(raw)?.[1];
      const data = /^data: (.+)$/m.exec(raw)?.[1];
      if (!event || !data) continue;
      if (event === 'sources') handlers.onSources(JSON.parse(data));
      if (event === 'token') handlers.onToken(JSON.parse(data));
    }
  }
}
