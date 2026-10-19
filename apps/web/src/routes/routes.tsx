import { Outlet, createBrowserRouter, redirect } from "react-router";

import Cookies from "js-cookie";

import { authPath, mainPath, rootAuthPath, rootMainPath } from "./paths";

import AuthContainer from "@containers/AuthContainer";
import MainContainer from "@containers/MainContainer";

import { TOKEN_COOKIE } from "@services/api";

import ErrorPage from "@pages/ErrorPage";

// Read inside the loader, not at module scope — otherwise the very first
// token value is baked in for the whole session.
const isAuthed = () => Boolean(Cookies.get(TOKEN_COOKIE));

export const router = createBrowserRouter([
  {
    path: "/",
    errorElement: <ErrorPage />,
    element: <Outlet />,
    children: [
      {
        index: true,
        loader: async () => redirect(isAuthed() ? mainPath.dashboard.path : authPath.signIn.path),
      },
      {
        path: rootAuthPath,
        element: <AuthContainer />,
        caseSensitive: true,
        children: [
          { index: true, loader: async () => redirect(authPath.signIn.path) },
          { path: "sign-in", element: <h2>sign-in</h2>, caseSensitive: true },
          { path: "sign-up", element: <h2>sign-up</h2>, caseSensitive: true },
        ],
      },
      {
        path: rootMainPath,
        element: <MainContainer />,
        caseSensitive: true,
        children: [
          { index: true, loader: async () => redirect(mainPath.dashboard.path) },
          ...Object.values(mainPath).map((path) => ({
            path: path.path,
            element: <path.component />,
            caseSensitive: true,
          })),
        ],
      },
    ],
  },
]);
