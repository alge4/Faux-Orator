import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Faux-Orator Dashboard',
  description: 'Campaign management dashboard for Faux-Orator',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
} 