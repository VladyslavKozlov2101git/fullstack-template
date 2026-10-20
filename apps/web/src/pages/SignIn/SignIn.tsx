import { FC, FormEvent, useState } from "react";
import { Link } from "react-router";

import clsx from "clsx";

import { authPath } from "@routes";

import styles from "./SignIn.module.scss";

import { useLoginMutation } from "@services/cachedAPI";

import { apiError } from "@helpers/functions";

import ButtonElement from "@shared/ButtonElement";
import InputElement from "@shared/InputElement";

interface SignInProps {
  className?: string;
}

/**
 * Controlled inputs rather than a FormData read: `InputElement` always passes a
 * `value`, so it is a controlled component and an uncontrolled read would see
 * nothing. No form library for two fields and no client-side password rule —
 * the API is the authority and its message is what gets rendered.
 */
const SignIn: FC<SignInProps> = ({ className = "" }) => {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [login, { isLoading, error }] = useLoginMutation(),
    // Every failure here is one 401 with one message. There is nothing to map
    // onto a field, and mapping it would reveal which half was wrong.
    { messages } = apiError(error),
    submit = (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      // No navigation on success: this invalidates "Me", AuthContainer sees the
      // session and redirects.
      void login({ email, password });
    };

  return (
    <>
      <title>Sign in | App</title>
      <meta name="description" content="Sign in to your account." />
      <form
        className={clsx(styles.root, className, "card-wrap")}
        onSubmit={submit}
        data-testid="sign-in"
      >
        <h2>Sign in</h2>

        <InputElement
          type="email"
          name="email"
          autoComplete="email"
          label="Email"
          withLabel
          placeholder="you@example.com"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <InputElement
          // `isPassword` on its own. Passing `type="password"` as well defeats
          // the show/hide toggle: the component falls back to `type` the moment
          // it flips.
          isPassword
          name="password"
          autoComplete="current-password"
          label="Password"
          withLabel
          placeholder="••••••••"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        {messages.length > 0 && (
          <p className="alert" role="alert">
            {messages.join(" ")}
          </p>
        )}

        <ButtonElement type="submit" text="Sign in" isLoading={isLoading} disabled={isLoading} />

        <p>
          No account yet? <Link to={authPath.signUp.path}>Create one</Link>
        </p>
      </form>
    </>
  );
};

export default SignIn;
