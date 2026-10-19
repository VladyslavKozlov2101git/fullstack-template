import { combineReducers } from "@reduxjs/toolkit";

import { cachedAPI } from "@services/cachedAPI";

// Only server state for now: the session used to live in a `session` slice that
// mirrored a JS-readable token cookie. The cookie is httpOnly, so there is
// nothing for the client to hold — RTK Query's "Me" entry is the session.
export const rootReducer = combineReducers({
  [cachedAPI.reducerPath]: cachedAPI.reducer,
});

export type RootState = ReturnType<typeof rootReducer>;
