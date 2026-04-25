import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MemoryMerge — Memory Explorer',
  description: 'Decentralized Memory OS for AI Agent Swarms · Powered by 0G Storage + Compute',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
