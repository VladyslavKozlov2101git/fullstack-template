import toast from "react-hot-toast";

import { createApiClient } from "@repo/api-client";

import { authPath } from "../routes/paths";

/**
 * The app's single API client. Types come from the OpenAPI spec, so every
 * path, body and response is checked at compile time — import `api` from here,
 * never `createApiClient` directly, or you lose the middleware below.
 *
 * No `credentials` option, because the session cookie rides along on its own:
 * dev goes through the Vite proxy and is same-origin. Point `VITE_API_URL` at
 * another origin and the browser discards `Set-Cookie` with no error anywhere —
 * login appears to succeed and `/auth/me` then 401s forever. That deployment
 * needs `credentials: "include"` here and CORS with credentials on the API.
 */
export const api = createApiClient(import.meta.env.VITE_API_URL);

api.use({
  onResponse({ request, response }) {
    if (response.ok) {
      return response;
    }

    // A 401 from an auth endpoint is an answer, not an expired session: it is a
    // wrong password, or /auth/me reporting that nobody is signed in. Redirecting
    // on those would wipe storage on every failed login and make /auth/sign-up
    // unreachable, since a cold load there calls /auth/me before rendering.
    if (response.status === 401 && !request.url.includes("/auth/")) {
      localStorage.clear();
      sessionStorage.clear();
      if (window.location.pathname !== authPath.signIn.path) {
        window.location.replace(authPath.signIn.path);
      }
    }

    if (response.status >= 500) {
      toast.error("Oops! Something went wrong. Please try again or contact support!");
    }

    return response;
  },
});
