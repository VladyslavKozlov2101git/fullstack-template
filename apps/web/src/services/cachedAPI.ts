import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";

import { api } from "./api";

import { CREDENTIALS, QUERY_ERROR, REGISTRATION } from "@models/Auth.model";
import { USER } from "@models/User.model";

const fail = (response: Response, body?: { message: string | string[] }) => ({
  error: { status: response.status, message: body?.message ?? response.statusText },
});

/**
 * Server-state cache. There is no baseQuery on purpose: `queryFn` calls the
 * generated client directly, so request and response types come from the
 * OpenAPI spec instead of being re-declared here.
 *
 * The session lives in an httpOnly cookie, so `getMe` is the only way the app
 * can know who is signed in — it is the source of truth the route guards read,
 * which is why every auth mutation invalidates it.
 */
export const cachedAPI = createApi({
  baseQuery: fakeBaseQuery<QUERY_ERROR>(),
  tagTypes: ["Users", "Me"],
  endpoints: (builder) => ({
    getUsers: builder.query<USER[], void>({
      queryFn: async () => {
        // Destructure before checking: narrowing the result union collapses
        // `response` to never when an endpoint declares no error responses.
        const { data, error, response } = await api.GET("/users");

        if (!response.ok || !data) {
          return fail(response, error);
        }

        return { data };
      },
      providesTags: ["Users"],
    }),

    getMe: builder.query<USER, void>({
      queryFn: async () => {
        const { data, error, response } = await api.GET("/auth/me");

        if (!response.ok || !data) {
          return fail(response, error);
        }

        return { data };
      },
      // Registered even while this query is in its error state, which is what
      // the sign-in flow leans on: logging in invalidates "Me" and the cached
      // 401 is refetched, which is how anything learns the session exists.
      // SignIn.test.tsx covers that path end to end.
      providesTags: ["Me"],
    }),

    register: builder.mutation<USER, REGISTRATION>({
      queryFn: async (body) => {
        const { data, error, response } = await api.POST("/auth/register", { body });

        if (!response.ok || !data) {
          return fail(response, error);
        }

        return { data };
      },
      invalidatesTags: ["Me"],
    }),

    login: builder.mutation<USER, CREDENTIALS>({
      queryFn: async (body) => {
        const { data, error, response } = await api.POST("/auth/login", { body });

        if (!response.ok || !data) {
          return fail(response, error);
        }

        return { data };
      },
      invalidatesTags: ["Me"],
    }),

    signOut: builder.mutation<void, void>({
      queryFn: async () => {
        const { response } = await api.POST("/auth/sign-out");

        // 204, so there is no body: checking `!data` as the other endpoints do
        // would report a successful sign-out as a failure.
        if (!response.ok) {
          return fail(response);
        }

        return { data: undefined };
      },
      // "Me" only. Invalidating "Users" too would refetch it — and that refetch
      // leaves without a cookie, gets a 401 from a non-auth path, and triggers
      // the hard redirect below, turning a sign-out into a full page reload.
      // The stale list is collected when the page unmounts.
      invalidatesTags: ["Me"],
    }),
  }),
});

export const {
  useGetMeQuery,
  useGetUsersQuery,
  useLoginMutation,
  useRegisterMutation,
  useSignOutMutation,
} = cachedAPI;
