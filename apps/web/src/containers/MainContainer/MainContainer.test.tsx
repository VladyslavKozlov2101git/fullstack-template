import { fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { RouterProvider, createMemoryRouter } from "react-router";

import { authPath, mainPath, rootMainPath } from "@routes";
import { afterEach, describe, expect, it, vi } from "vitest";

import MainContainer from "./MainContainer";

import { setupStore } from "@app/store";

import Users from "@pages/Users";

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

  it("keeps a signed-in visitor in place when the session check itself fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 500 })),
    );

    renderGuard();

    // A 500 is not a 401. Bouncing to the login form here would lose the
    // visitor's place and tell them something untrue about their session.
    expect(await screen.findByText(/could not check your session/i)).toBeInTheDocument();
    expect(screen.queryByText("sign-in page")).not.toBeInTheDocument();
  });

  it("signs out without reloading the page", async () => {
    const replace = vi.fn();
    let signedIn = true;

    // api.ts reads window.location to decide whether to hard-redirect, and
    // jsdom's own location cannot be spied on.
    vi.stubGlobal("location", { ...window.location, pathname: mainPath.users.path, replace });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: Request | string) => {
        const url = typeof input === "string" ? input : input.url;

        if (url.includes("/auth/sign-out")) {
          signedIn = false;

          return new Response(null, { status: 204 });
        }

        if (url.includes("/auth/me")) {
          return signedIn
            ? Response.json(user, { status: 200 })
            : new Response(null, { status: 401 });
        }

        // The real page under test fetches this. If sign-out invalidated it as
        // well, this would answer 401 and api.ts would reload the whole page.
        return signedIn
          ? Response.json([user], { status: 200 })
          : new Response(null, { status: 401 });
      }),
    );

    render(
      <Provider store={setupStore()}>
        <RouterProvider
          router={createMemoryRouter(
            [
              {
                path: rootMainPath,
                element: <MainContainer />,
                children: [{ path: "users", element: <Users /> }],
              },
              { path: authPath.signIn.path, element: <h2>sign-in page</h2> },
            ],
            { initialEntries: [mainPath.users.path] },
          )}
        />
      </Provider>,
    );

    fireEvent.click(await screen.findByText("Sign out"));

    expect(await screen.findByText("sign-in page")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
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
