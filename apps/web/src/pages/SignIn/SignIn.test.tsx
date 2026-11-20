import { fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter, RouterProvider, createMemoryRouter } from "react-router";

import { authPath, mainPath, rootAuthPath } from "@routes";
import { afterEach, describe, expect, it, vi } from "vitest";

import SignIn from "./SignIn";

import AuthContainer from "@containers/AuthContainer";

import { setupStore } from "@app/store";

const user = {
    id: "ckz1",
    email: "ada@example.com",
    name: "Ada",
    createdAt: new Date().toISOString(),
  },
  fill = (testId: string) => {
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "ada@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password1" } });
    fireEvent.submit(screen.getByTestId(testId));
  };

describe("SignIn", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the API's message when the credentials are wrong", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          { statusCode: 401, message: "Email or password is incorrect.", error: "Unauthorized" },
          { status: 401 },
        ),
      ),
    );

    render(
      <Provider store={setupStore()}>
        <MemoryRouter>
          <SignIn />
        </MemoryRouter>
      </Provider>,
    );
    fill("sign-in");

    expect(await screen.findByText(/email or password is incorrect/i)).toBeInTheDocument();
  });

  // The whole sign-in path, because the interesting part is not the form: a
  // successful login only moves the visitor if invalidating "Me" refetches an
  // /auth/me that is currently a cached 401.
  it("takes the visitor into the app after a successful sign-in", async () => {
    let signedIn = false;

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: Request | string) => {
        const url = typeof input === "string" ? input : input.url;

        if (url.includes("/auth/login")) {
          signedIn = true;

          return Response.json(user, { status: 200 });
        }

        if (url.includes("/auth/me")) {
          return signedIn
            ? Response.json(user, { status: 200 })
            : new Response(null, { status: 401 });
        }

        return new Response(null, { status: 404 });
      }),
    );

    render(
      <Provider store={setupStore()}>
        <RouterProvider
          router={createMemoryRouter(
            [
              {
                path: rootAuthPath,
                element: <AuthContainer />,
                children: [{ path: "sign-in", element: <SignIn /> }],
              },
              { path: mainPath.dashboard.path, element: <h2>dashboard page</h2> },
            ],
            { initialEntries: [authPath.signIn.path] },
          )}
        />
      </Provider>,
    );

    // AuthContainer holds a loader until /auth/me answers, so the form is not
    // there on the first frame.
    await screen.findByTestId("sign-in");
    fill("sign-in");

    expect(await screen.findByText("dashboard page")).toBeInTheDocument();
  });
});
