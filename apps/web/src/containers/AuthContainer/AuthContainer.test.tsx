import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { RouterProvider, createMemoryRouter } from "react-router";

import { mainPath, rootAuthPath } from "@routes";
import { afterEach, describe, expect, it, vi } from "vitest";

import AuthContainer from "./AuthContainer";

import { setupStore } from "@app/store";

const user = {
    id: "ckz1",
    email: "ada@example.com",
    name: "Ada",
    createdAt: new Date().toISOString(),
  },
  renderGuard = (at: string) =>
    render(
      <Provider store={setupStore()}>
        <RouterProvider
          router={createMemoryRouter(
            [
              {
                path: rootAuthPath,
                element: <AuthContainer />,
                children: [
                  { path: "sign-in", element: <h2>sign-in page</h2> },
                  { path: "sign-up", element: <h2>sign-up page</h2> },
                ],
              },
              { path: mainPath.dashboard.path, element: <h2>dashboard page</h2> },
            ],
            { initialEntries: [at] },
          )}
        />
      </Provider>,
    );

describe("AuthContainer", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends a signed-in visitor away from sign-in", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json(user, { status: 200 })),
    );

    renderGuard(`${rootAuthPath}/sign-in`);

    expect(await screen.findByText("dashboard page")).toBeInTheDocument();
  });

  // Regression guard: the 401 handler in api.ts used to hard-redirect anything
  // that was not /auth/sign-in, so a cold load of sign-up bounced before it
  // could render and the page was unreachable.
  it("renders sign-up for a visitor who is not signed in", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 401 })),
    );

    renderGuard(`${rootAuthPath}/sign-up`);

    expect(await screen.findByText("sign-up page")).toBeInTheDocument();
  });
});
