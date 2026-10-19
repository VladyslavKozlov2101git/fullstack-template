import createClient from 'openapi-fetch';
import type { paths } from './schema';

export type { paths, components } from './schema';

// Same-origin: Vite proxies /api in dev, a reverse proxy does it in prod.
export const api = createClient<paths>({ baseUrl: '/api' });
