import { combineReducers } from "@reduxjs/toolkit";

import { cachedAPI } from "@services/cachedAPI";

import sessionReducer from "@redux/SessionSlice/SessionSlice";

export const rootReducer = combineReducers({
  session: sessionReducer,
  [cachedAPI.reducerPath]: cachedAPI.reducer,
});

export type RootState = ReturnType<typeof rootReducer>;
