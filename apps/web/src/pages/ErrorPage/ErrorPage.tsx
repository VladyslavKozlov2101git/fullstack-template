import { FC } from "react";
import { isRouteErrorResponse, useRouteError } from "react-router";

import clsx from "clsx";

import styles from "./ErrorPage.module.scss";

interface ErrorPageProps {
  className?: string;
}

const ErrorPage: FC<ErrorPageProps> = ({ className = "" }) => {
  const error = useRouteError();
  console.log(error);

  return (
    <>
      <title>Something went wrong | App</title>
      <meta name="description" content="This page could not be loaded." />
      {/* The only page that opts out: an error is nothing to rank. */}
      <meta name="robots" content="noindex" />
      <div className={clsx(styles.root, className)}>
        {isRouteErrorResponse(error) && typeof error.data === "string" ? (
          <>
            <h1>{error.status}</h1>
            <h2>{error.statusText || "An error occurred"}</h2>
            <p>{error.data}</p>
          </>
        ) : error instanceof Error ? (
          <>
            <h3>Oops! Something went wrong!</h3>
            <details>
              <p>{error.message}</p>
            </details>
          </>
        ) : (
          "Something went wrong."
        )}
      </div>
    </>
  );
};

export default ErrorPage;
