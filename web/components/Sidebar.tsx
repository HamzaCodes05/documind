'use client';
import { useRef, useState } from 'react';
import { DocumentItem, deleteDocument, uploadDocument } from '@/lib/api';

export default function Sidebar({
  docs,
  refresh,
  onLogout,
}: {
  docs: DocumentItem[];
  refresh: () => void;
  onLogout: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      await uploadDocument(file);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-slate-800 bg-slate-900 p-4">
      <h1 className="mb-4 text-xl font-semibold">DocuMind</h1>
      <input ref={input} type="file" accept=".pdf,.txt,.md" onChange={onFile} className="hidden" />
      <button
        onClick={() => input.current?.click()}
        disabled={busy}
        className="rounded-lg bg-indigo-600 py-2 text-sm font-medium hover:bg-indigo-500 disabled:opacity-50"
      >
        {busy ? 'Indexing…' : 'Upload PDF / TXT / MD'}
      </button>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      <ul className="mt-4 flex-1 space-y-2 overflow-y-auto">
        {docs.length === 0 && <li className="text-sm text-slate-500">No documents yet.</li>}
        {docs.map((d) => (
          <li key={d.id} className="group flex items-center justify-between rounded-lg bg-slate-800 px-3 py-2 text-sm">
            <div className="min-w-0">
              <p className="truncate">{d.filename}</p>
              <p className="text-xs text-slate-500">{d.chunks} chunks</p>
            </div>
            <button
              onClick={() => deleteDocument(d.id).then(refresh)}
              className="ml-2 text-slate-500 hover:text-red-400"
              aria-label={`Delete ${d.filename}`}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <button onClick={onLogout} className="mt-4 text-sm text-slate-400 hover:text-slate-200">
        Sign out
      </button>
    </aside>
  );
}
