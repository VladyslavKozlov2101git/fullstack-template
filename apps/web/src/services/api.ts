import toast from "react-hot-toast";

import { createApiClient } from "@repo/api-client";
import Cookies from "js-cookie";

import { authPath } from "../routes/paths";

export const TOKEN_COOKIE = "token";

/**
 * The app's single API client. Types come from the OpenAPI spec, so every
 * path, body and response is checked at compile time — import `api` from here,
 * never `createApiClient` directly, or you lose the middleware below.
 */
export const api = createApiClient(import.meta.env.VITE_API_URL);

api.use({
  onRequest({ request }) {
    const token = Cookies.get(TOKEN_COOKIE);
    if (token) {
      request.headers.set("Authorization", `Bearer ${token}`);
    }

    return request;
  },

  onResponse({ response }) {
    if (response.ok) {
      return response;
    }

    if (response.status === 401) {
      Cookies.remove(TOKEN_COOKIE);
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
