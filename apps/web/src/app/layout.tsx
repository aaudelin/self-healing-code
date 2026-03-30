import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import { Toaster } from '@/components/ui/toaster';
import { TRPCProvider } from '@/lib/trpc/provider';

import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AIOps Self-Healing Pipeline',
  description: 'Automated error detection and remediation platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <TRPCProvider>
          <div className="min-h-screen bg-background">
            <header className="border-b">
              <div className="container flex h-16 items-center px-4">
                <h1 className="text-xl font-bold">AIOps Self-Healing Pipeline</h1>
              </div>
            </header>
            <main className="container py-6">{children}</main>
          </div>
          <Toaster />
        </TRPCProvider>
      </body>
    </html>
  );
}
