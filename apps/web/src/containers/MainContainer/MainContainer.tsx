import { FC, Fragment, ReactNode, Suspense, useEffect } from "react";
import { Outlet, useNavigate } from "react-router";

import clsx from "clsx";

import Footer from "@layouts/Footer";
import Header from "@layouts/Header";

import styles from "./MainContainer.module.scss";

import { authPath } from "../../routes/paths";

import { useAppSelector } from "@app/reduxHooks";

import LoaderComponent from "@shared/LoaderComponent";

interface MainContainerProps {
  className?: string;
  children?: ReactNode;
}

const MainContainer: FC<MainContainerProps> = ({ className = "" }) => {
  const token = useAppSelector((state) => state.session.token),
    navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate(authPath.signIn.path);
    }
  }, [token, navigate]);

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
