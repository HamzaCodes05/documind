'use client';
import { useState } from 'react';
import { auth, setToken } from '@/lib/api';

export default function AuthForm({ onAuthed }: { onAuthed: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { accessToken } = await auth(mode, email, password);
      setToken(accessToken);
      onAuthed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl bg-slate-900 p-6 shadow-xl">
        <div>
          <h1 className="text-2xl font-semibold">DocuMind</h1>
          <p className="text-sm text-slate-400">Chat with your documents. Answers come with sources.</p>
        </div>
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg bg-slate-800 px-3 py-2 outline-none ring-indigo-500 focus:ring-2"
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="Password (min 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg bg-slate-800 px-3 py-2 outline-none ring-indigo-500 focus:ring-2"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          disabled={loading}
          className="w-full rounded-lg bg-indigo-600 py-2 font-medium hover:bg-indigo-500 disabled:opacity-50"
        >
          {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          className="w-full text-sm text-slate-400 hover:text-slate-200"
        >
          {mode === 'login' ? "No account? Register" : 'Have an account? Sign in'}
        </button>
      </form>
    </main>
  );
}
