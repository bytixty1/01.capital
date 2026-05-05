import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '01 Capital',
  description: 'Cap table and equity management for Saudi startups.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
