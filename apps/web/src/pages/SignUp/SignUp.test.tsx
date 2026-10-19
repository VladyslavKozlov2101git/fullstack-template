import { fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router";

import { afterEach, describe, expect, it, vi } from "vitest";

import SignUp from "./SignUp";

import { setupStore } from "@app/store";

const renderPage = () =>
    render(
      <Provider store={setupStore()}>
        <MemoryRouter>
          <SignUp />
        </MemoryRouter>
      </Provider>,
    ),
  // The error must be attached to the right input, not merely somewhere on the
  // page — that association is what the acceptance criteria are about.
  fieldError = (label: string) => {
    const id = screen.getByLabelText(label).getAttribute("aria-describedby");

    return id ? document.getElementById(id) : null;
  },
  submit = (password: string) => {
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "ada@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
    fireEvent.submit(screen.getByTestId("sign-up"));
  };

describe("SignUp", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("puts a duplicate-email conflict on the email field", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          { statusCode: 409, message: "That email is already registered.", error: "Conflict" },
          { status: 409 },
        ),
      ),
    );

    renderPage();
    submit("password1");

    expect(await screen.findByText(/already registered/i)).toBeInTheDocument();
    expect(fieldError("Email")).toHaveTextContent(/already registered/i);
    expect(fieldError("Password")).toBeNull();
  });

  it("puts the password rule on the password field, in the API's own words", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          {
            statusCode: 400,
            message: ["Password must be at least 8 characters."],
            error: "Bad Request",
          },
          { status: 400 },
        ),
      ),
    );

    renderPage();
    submit("short");

    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(fieldError("Password")).toHaveTextContent(/at least 8 characters/i);
    expect(fieldError("Email")).toBeNull();
  });
});
