'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: '100vh', backgroundColor: '#0A0F1E', color: '#FFFFFF', display: 'grid', placeItems: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '560px', width: '100%', border: '1px solid #1E2D4A', borderRadius: '16px', backgroundColor: '#0D1428', padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#FF4D6A20', display: 'grid', placeItems: 'center' }}>
              <AlertCircle size={20} color="#FF4D6A" />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#8A9BB5', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Global error boundary</div>
              <h1 style={{ fontSize: '22px', marginTop: '2px' }}>MemoryMerge UI hit a fatal error</h1>
            </div>
          </div>
          <p style={{ color: '#8A9BB5', lineHeight: 1.7, marginBottom: '18px' }}>
            The application boundary failed. This keeps the app recoverable without losing the browser session.
          </p>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', backgroundColor: '#060B16', border: '1px solid #1E2D4A', borderRadius: '12px', padding: '14px', color: '#FFB7C4', fontSize: '12px', marginBottom: '18px' }}>
            {error.message}
          </pre>
          <button
            onClick={reset}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 16px', border: 'none', borderRadius: '10px', backgroundColor: '#1D6FEB', color: '#FFFFFF', cursor: 'pointer', fontWeight: 600 }}
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </body>
    </html>
  );
}
