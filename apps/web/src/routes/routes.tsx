import { Outlet, createBrowserRouter, redirect } from "react-router";

import { authPath, mainPath, rootAuthPath, rootMainPath } from "./paths";

import AuthContainer from "@containers/AuthContainer";
import MainContainer from "@containers/MainContainer";

import ErrorPage from "@pages/ErrorPage";

export const router = createBrowserRouter([
  {
    path: "/",
    errorElement: <ErrorPage />,
    element: <Outlet />,
    children: [
      {
        // No session check here: the cookie is httpOnly, so the answer needs a
        // request. MainContainer asks, and sends the visitor to sign-in if the
        // answer is no.
        index: true,
        loader: async () => redirect(rootMainPath),
      },
      {
        path: rootAuthPath,
        element: <AuthContainer />,
        caseSensitive: true,
        children: [
          { index: true, loader: async () => redirect(authPath.signIn.path) },
          ...Object.values(authPath).map((path) => ({
            path: path.path,
            element: <path.component />,
            caseSensitive: true,
          })),
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
