import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { RouterProvider, createMemoryRouter } from "react-router";

import { authPath, mainPath, rootMainPath } from "@routes";
import { afterEach, describe, expect, it, vi } from "vitest";

import MainContainer from "./MainContainer";

import { setupStore } from "@app/store";

const user = {
    id: "ckz1",
    email: "ada@example.com",
    name: "Ada",
    createdAt: new Date().toISOString(),
  },
  // A router is needed because the guard redirects by rendering <Navigate/>,
  // and because Header renders NavLinks.
  renderGuard = () =>
    render(
      <Provider store={setupStore()}>
        <RouterProvider
          router={createMemoryRouter(
            [
              {
                path: rootMainPath,
                element: <MainContainer />,
                children: [{ path: "users", element: <h2>protected page</h2> }],
              },
              { path: authPath.signIn.path, element: <h2>sign-in page</h2> },
            ],
            { initialEntries: [mainPath.users.path] },
          )}
        />
      </Provider>,
    );

describe("MainContainer", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends an unauthenticated visitor to sign-in", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 401 })),
    );

    renderGuard();

    expect(await screen.findByText("sign-in page")).toBeInTheDocument();
    // The protected page must never mount: mounting it would fire its own
    // requests and 401 before the redirect landed.
    expect(screen.queryByText("protected page")).not.toBeInTheDocument();
  });

  it("renders the protected page for a signed-in visitor", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json(user, { status: 200 })),
    );

    renderGuard();

    expect(await screen.findByText("protected page")).toBeInTheDocument();
  });
});
