'use client';
import { useEffect, useRef, useState } from 'react';
import { ChatMessage, streamChat } from '@/lib/api';

export default function Chat({ hasDocs }: { hasDocs: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || streaming) return;

    const history = messages.map(({ role, content }) => ({ role, content }));
    setInput('');
    setStreaming(true);
    setMessages((m) => [...m, { role: 'user', content: question }, { role: 'assistant', content: '' }]);

    const patchLast = (fn: (m: ChatMessage) => ChatMessage) =>
      setMessages((all) => [...all.slice(0, -1), fn(all[all.length - 1])]);

    try {
      await streamChat(question, history, {
        onSources: (sources) => patchLast((m) => ({ ...m, sources })),
        onToken: (t) => patchLast((m) => ({ ...m, content: m.content + t })),
      });
    } catch (err) {
      patchLast((m) => ({ ...m, content: err instanceof Error ? err.message : 'Something went wrong' }));
    } finally {
      setStreaming(false);
    }
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col">
      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        {messages.length === 0 && (
          <p className="mt-20 text-center text-slate-500">
            {hasDocs ? 'Ask anything about your documents.' : 'Upload a document to get started.'}
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : ''}>
            <div className={`max-w-2xl rounded-2xl px-4 py-3 ${m.role === 'user' ? 'bg-indigo-600' : 'bg-slate-800'}`}>
              <p className="whitespace-pre-wrap">{m.content || (streaming && i === messages.length - 1 ? '…' : '')}</p>
              {m.sources && m.sources.length > 0 && (
                <details className="mt-3 text-sm text-slate-300">
                  <summary className="cursor-pointer text-slate-400">Sources ({m.sources.length})</summary>
                  <ul className="mt-2 space-y-2">
                    {m.sources.map((s) => (
                      <li key={s.n} className="rounded-lg bg-slate-900 p-2">
                        <p className="font-medium">
                          [{s.n}] {s.filename}
                          {s.page ? `, p.${s.page}` : ''}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">{s.snippet}…</p>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </div>
        ))}
        <div ref={bottom} />
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-slate-800 p-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question…"
          className="flex-1 rounded-lg bg-slate-800 px-4 py-2 outline-none ring-indigo-500 focus:ring-2"
        />
        <button
          disabled={streaming || !input.trim()}
          className="rounded-lg bg-indigo-600 px-5 font-medium hover:bg-indigo-500 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </section>
  );
}
