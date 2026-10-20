import { FC, Fragment, ReactNode, Suspense } from "react";
import { Navigate, Outlet } from "react-router";

import clsx from "clsx";

import Footer from "@layouts/Footer";
import Header from "@layouts/Header";

import styles from "./MainContainer.module.scss";

import { authPath } from "../../routes/paths";

import { useGetMeQuery } from "@services/cachedAPI";

import ButtonElement from "@shared/ButtonElement";
import LoaderComponent from "@shared/LoaderComponent";

interface MainContainerProps {
  className?: string;
  children?: ReactNode;
}

/**
 * The guard for everything under /main. It gates on `isSuccess`/`isError`, not
 * on `isLoading`: RTK Query's first render is `isUninitialized` with
 * `isLoading: false` and no data, so a `!isLoading && !data` test would bounce
 * every visitor on mount. Redirecting during render rather than in an effect
 * also means the protected page never mounts, never fires a request that 401s,
 * and never pushes a history entry the Back button falls into.
 */
const MainContainer: FC<MainContainerProps> = ({ className = "" }) => {
  const { isSuccess, error, refetch } = useGetMeQuery(),
    // Only a 401 means "signed out". `isError` also covers a 5xx or a dropped
    // connection, and bouncing a signed-in visitor to the login form over a
    // transient failure loses their place and tells them something untrue.
    signedOut = Boolean(error && "status" in error && error.status === 401);

  if (signedOut) return <Navigate to={authPath.signIn.path} replace />;

  if (error) {
    return (
      <main className="container page-wrap">
        <p className="alert" role="alert">
          Could not check your session.
        </p>
        <ButtonElement text="Try again" onClick={() => void refetch()} />
      </main>
    );
  }

  if (!isSuccess) return <LoaderComponent />;

  return (
    <Fragment>
      <Header />
      <main className={clsx(styles.root, className, "container", "page-wrap")}>
        <Suspense fallback={<LoaderComponent />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </Fragment>
  );
};

export default MainContainer;
