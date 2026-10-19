import { useEffect, useState } from 'react';
import { api } from '@app/api-client';

export function App() {
  const [status, setStatus] = useState('…');

  useEffect(() => {
    api
      .GET('/health')
      .then((r) => setStatus(r.data?.status ?? 'error'))
      .catch(() => setStatus('offline'));
  }, []);

  return <main>API: {status}</main>;
}
