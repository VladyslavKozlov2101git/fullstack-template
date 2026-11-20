import { FC } from "react";
import { NavLink } from "react-router";

import clsx from "clsx";

import styles from "./Header.module.scss";

import { mainPath } from "../../routes/paths";

import { useSignOutMutation } from "@services/cachedAPI";

import ButtonElement from "@shared/ButtonElement";

interface HeaderProps {
  className?: string;
}

const Header: FC<HeaderProps> = ({ className = "" }) => {
  // No `signed in?` check around the button: MainContainer is the only thing
  // that renders this header, and it does not render until /auth/me succeeded.
  //
  // Signing out invalidates "Me", which refetches /auth/me, which 401s, which
  // makes MainContainer redirect. One server round trip, no page reload.
  const [signOut, { isLoading }] = useSignOutMutation();

  return (
    <header className={clsx(styles.root, className)}>
      <div className="container">
        <nav className={styles.navigation}>
          {Object.values(mainPath).map((path) => (
            <li key={path.path}>
              <NavLink to={path.path}>{path.name}</NavLink>
            </li>
          ))}

          <li className="my-auto">
            <ButtonElement
              text="Sign out"
              view="link"
              size="small"
              isLoading={isLoading}
              disabled={isLoading}
              onClick={() => void signOut()}
            />
          </li>
        </nav>
      </div>
    </header>
  );
};

export default Header;
