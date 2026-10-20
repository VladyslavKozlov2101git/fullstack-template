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
    // 409 is always about the email.
    onEmail = status === 409 ? messages : messages.filter((m) => /email/i.test(m)),
    onPassword = status === 409 ? [] : messages.filter((m) => /password/i.test(m)),
    // Whatever matched no field still has to be visible. Keying this off the
    // status instead would silently drop any message that names neither.
    onForm = messages.filter((m) => !onEmail.includes(m) && !onPassword.includes(m)),
    submit = (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      // Registering signs the user in, so this takes the same route as a login:
      // invalidate "Me" and let AuthContainer redirect.
      void register({ email, password });
    };

  return (
    <>
      <title>Sign up | App</title>
      <meta name="description" content="Create an account to get started." />
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
          error={onEmail.join(" ")}
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
          error={onPassword.join(" ")}
          onChange={(event) => setPassword(event.target.value)}
        />

        {onForm.length > 0 && (
          <p className="alert" role="alert">
            {onForm.join(" ")}
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
