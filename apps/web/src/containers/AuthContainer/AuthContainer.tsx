import { FC, Fragment, ReactNode, Suspense } from "react";
import { Navigate, Outlet } from "react-router";

import clsx from "clsx";

import styles from "./AuthContainer.module.scss";

import { mainPath } from "../../routes/paths";

import { useGetMeQuery } from "@services/cachedAPI";

import LoaderComponent from "@shared/LoaderComponent";

interface AuthContainerProps {
  className?: string;
  children?: ReactNode;
}

/**
 * The mirror of MainContainer, reading the same cache entry. Both gate on
 * `isSuccess`/`isError` so exactly one of them ever redirects: mixing
 * predicates (`!data` here, `data` there) makes both read "unauthenticated"
 * while the request is pending, which loses a deep link and leaves two junk
 * history entries behind.
 */
const AuthContainer: FC<AuthContainerProps> = ({ className = "" }) => {
  const { isSuccess, isError } = useGetMeQuery();

  if (isSuccess) return <Navigate to={mainPath.dashboard.path} replace />;

  if (!isError) return <LoaderComponent />;

  return (
    <Fragment>
      <header className={styles.header}>Header</header>
      <main className={clsx(styles.root, className, "container")}>
        <Suspense fallback={<LoaderComponent />}>
          <Outlet />
        </Suspense>
      </main>
      <footer className={styles.footer}>Footer</footer>
    </Fragment>
  );
};

export default AuthContainer;
