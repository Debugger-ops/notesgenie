import type { Metadata } from 'next';
import './globals.css';
import AuthProvider from '../components/AuthProvider';

export const metadata: Metadata = {
  title: 'NoteGenie',
  description: 'AI-powered notes summarizer for students',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
