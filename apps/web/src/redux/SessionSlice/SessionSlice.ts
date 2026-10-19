import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import Cookies from "js-cookie";

import { TOKEN_COOKIE } from "@services/api";

interface SessionState {
  token: string | null;
}

// The cookie is the source of truth across reloads; the slice mirrors it so
// components read one place instead of each calling Cookies.get themselves.
const initialState: SessionState = {
  token: Cookies.get(TOKEN_COOKIE) ?? null,
};

export const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {
    signIn: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
      Cookies.set(TOKEN_COOKIE, action.payload, { sameSite: "lax", secure: true });
    },
    signOut: (state) => {
      state.token = null;
      Cookies.remove(TOKEN_COOKIE);
      localStorage.clear();
      sessionStorage.clear();
    },
  },
});

export const { signIn, signOut } = sessionSlice.actions;
export default sessionSlice.reducer;
