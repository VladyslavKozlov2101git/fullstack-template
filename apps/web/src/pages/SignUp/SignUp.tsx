import { FC, FormEvent, useState } from "react";
import { Link } from "react-router";

import clsx from "clsx";

import { authPath } from "@routes";

import styles from "./SignUp.module.scss";

import { useRegisterMutation } from "@services/cachedAPI";

import { apiError } from "@helpers/functions";

import ButtonElement from "@shared/ButtonElement";
import InputElement from "@shared/InputElement";

interface SignUpProps {
  className?: string;
}

const SignUp: FC<SignUpProps> = ({ className = "" }) => {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [register, { isLoading, error }] = useRegisterMutation(),
    { status, messages } = apiError(error),
    // The validation pipe answers with one message per broken rule and each one
    // names its own field, so they can land under the input they are about. A
    // 409 is always the email. Anything else has no field to sit on.
    emailError = status === 409 ? messages.join(" ") : messages.find((m) => /email/i.test(m)),
    passwordError = messages.find((m) => /password/i.test(m)),
    formError = status === 400 || status === 409 ? "" : messages.join(" "),
    submit = (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      // Registering signs the user in, so this takes the same route as a login:
      // invalidate "Me" and let AuthContainer redirect.
      void register({ email, password });
    };

  return (
    <>
      <title>Sign up | App</title>
      <form
        className={clsx(styles.root, className, "card-wrap")}
        onSubmit={submit}
        data-testid="sign-up"
      >
        <h2>Create an account</h2>

        <InputElement
          type="email"
          name="email"
          autoComplete="email"
          label="Email"
          withLabel
          placeholder="you@example.com"
          required
          value={email}
          error={emailError}
          onChange={(event) => setEmail(event.target.value)}
        />

        <InputElement
          isPassword
          name="password"
          autoComplete="new-password"
          label="Password"
          withLabel
          placeholder="At least 8 characters"
          required
          value={password}
          error={passwordError}
          onChange={(event) => setPassword(event.target.value)}
        />

        {formError && (
          <p className="alert" role="alert">
            {formError}
          </p>
        )}

        <ButtonElement
          type="submit"
          text="Create account"
          isLoading={isLoading}
          disabled={isLoading}
        />

        <p>
          Already have an account? <Link to={authPath.signIn.path}>Sign in</Link>
        </p>
      </form>
    </>
  );
};

export default SignUp;
