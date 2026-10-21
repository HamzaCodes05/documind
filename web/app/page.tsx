'use client';
import { useCallback, useEffect, useState } from 'react';
import AuthForm from '@/components/AuthForm';
import Chat from '@/components/Chat';
import Sidebar from '@/components/Sidebar';
import { DocumentItem, clearToken, getToken, listDocuments } from '@/lib/api';

export default function Home() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [docs, setDocs] = useState<DocumentItem[]>([]);

  const refresh = useCallback(() => {
    listDocuments().then(setDocs).catch(() => {
      clearToken();
      setAuthed(false);
    });
  }, []);

  useEffect(() => {
    setAuthed(!!getToken());
    setReady(true);
  }, []);

  useEffect(() => {
    if (authed) refresh();
  }, [authed, refresh]);

  if (!ready) return null;
  if (!authed) return <AuthForm onAuthed={() => setAuthed(true)} />;

  return (
    <div className="flex h-screen">
      <Sidebar
        docs={docs}
        refresh={refresh}
        onLogout={() => {
          clearToken();
          setAuthed(false);
          setDocs([]);
        }}
      />
      <Chat hasDocs={docs.length > 0} />
    </div>
  );
}
