import { FC, Fragment, ReactNode, Suspense, useEffect } from "react";
import { Outlet, useNavigate } from "react-router";

import clsx from "clsx";

import styles from "./AuthContainer.module.scss";

import { mainPath } from "../../routes/paths";

import { useAppSelector } from "@app/reduxHooks";

import LoaderComponent from "@shared/LoaderComponent";

interface AuthContainerProps {
  className?: string;
  children?: ReactNode;
}

const AuthContainer: FC<AuthContainerProps> = ({ className = "" }) => {
  const token = useAppSelector((state) => state.session.token),
    navigate = useNavigate();

  useEffect(() => {
    if (token) {
      navigate(mainPath.dashboard.path);
    }
  }, [token, navigate]);

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
