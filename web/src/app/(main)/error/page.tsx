// app/error/page.tsx
'use client';

import Link from 'next/link';
import { ROUTES } from '@/lib/constants';
import { ERROR_LABELS } from '@/lib/labels';
import BgOverlay from '@/app/(main)/components/BgOverlay';

export default function ErrorPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[rgb(var(--bg))]">
      <BgOverlay />
      <div className="relative z-10 text-center p-8 bg-[rgb(var(--card))] backdrop-blur-sm rounded-lg shadow-md border border-[rgb(var(--border))]">
        <h1 className="text-2xl font-bold text-[rgb(var(--destructive))] mb-4">{ERROR_LABELS.ACCESS_ERROR}</h1>
        <p className="text-[rgb(var(--card-foreground))] mb-6">{ERROR_LABELS.UNKNOWN_ERROR}</p>
        <Link
          href={ROUTES.HOME}
          className="inline-block px-6 py-2 bg-[rgb(var(--primary))] text-white rounded-md hover:bg-[rgb(var(--primary-hover))]"
        >
          {ERROR_LABELS.BACK_HOME}
        </Link>
      </div>
    </div>
  );
}