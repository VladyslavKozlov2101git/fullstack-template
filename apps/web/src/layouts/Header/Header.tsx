import { FC } from "react";
import { NavLink } from "react-router";

import clsx from "clsx";

import styles from "./Header.module.scss";

import { mainPath } from "../../routes/paths";

import { useAppDispatch, useAppSelector } from "@app/reduxHooks";

import { signOut } from "@redux/SessionSlice/SessionSlice";

import ButtonElement from "@shared/ButtonElement";

interface HeaderProps {
  className?: string;
}

const Header: FC<HeaderProps> = ({ className = "" }) => {
  const dispatch = useAppDispatch(),
    token = useAppSelector((state) => state.session.token);

  return (
    <header className={clsx(styles.root, className)}>
      <div className="container">
        <nav className={styles.navigation}>
          {Object.values(mainPath).map((path) => (
            <li key={path.path}>
              <NavLink to={path.path}>{path.name}</NavLink>
            </li>
          ))}

          {token && (
            <li className="my-auto">
              <ButtonElement
                text="Sign out"
                view="link"
                size="small"
                onClick={() => dispatch(signOut())}
              />
            </li>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
