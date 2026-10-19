import { FC, Fragment, ReactNode, Suspense } from "react";
import { Navigate, Outlet } from "react-router";

import clsx from "clsx";

import Footer from "@layouts/Footer";
import Header from "@layouts/Header";

import styles from "./MainContainer.module.scss";

import { authPath } from "../../routes/paths";

import { useGetMeQuery } from "@services/cachedAPI";

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
  const { isSuccess, isError } = useGetMeQuery();

  if (isError) return <Navigate to={authPath.signIn.path} replace />;

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
