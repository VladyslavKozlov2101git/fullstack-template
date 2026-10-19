import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";

import { afterEach, describe, expect, it, vi } from "vitest";

import Users from "./Users";

import { setupStore } from "@app/store";

const user = {
    id: "ckz1",
    email: "ada@example.com",
    name: "Ada",
    createdAt: new Date().toISOString(),
  },
  renderPage = () =>
    render(
      <Provider store={setupStore()}>
        <Users />
      </Provider>,
    );

describe("Users", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Covers the whole read path: typed client -> RTK Query -> page states.
  it("renders rows returned by the API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json([user], { status: 200 })),
    );

    renderPage();

    expect(await screen.findByText(user.email)).toBeInTheDocument();
  });

  it("shows an error when the API fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 500 })),
    );

    renderPage();

    expect(await screen.findByText(/could not load users/i)).toBeInTheDocument();
  });
});
