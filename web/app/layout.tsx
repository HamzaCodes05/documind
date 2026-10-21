import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DocuMind: chat with your documents',
  description: 'RAG knowledge base with hybrid search and cited answers',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
