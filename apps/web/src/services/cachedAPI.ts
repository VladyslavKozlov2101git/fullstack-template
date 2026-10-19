import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";

import { api } from "./api";

import { USER } from "@models/User.model";

/**
 * Server-state cache. There is no baseQuery on purpose: `queryFn` calls the
 * generated client directly, so request and response types come from the
 * OpenAPI spec instead of being re-declared here.
 */
export const cachedAPI = createApi({
  baseQuery: fakeBaseQuery<{ status: number; message: string }>(),
  tagTypes: ["Users"],
  endpoints: (builder) => ({
    getUsers: builder.query<USER[], void>({
      queryFn: async () => {
        // Destructure before checking: narrowing the result union collapses
        // `response` to never when an endpoint declares no error responses.
        const { data, response } = await api.GET("/users");

        if (!response.ok || !data) {
          return { error: { status: response.status, message: response.statusText } };
        }

        return { data };
      },
      providesTags: ["Users"],
    }),
  }),
});

export const { useGetUsersQuery } = cachedAPI;
