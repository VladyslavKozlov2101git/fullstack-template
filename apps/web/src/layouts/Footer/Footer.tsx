import { FC } from "react";

import clsx from "clsx";

import styles from "./Footer.module.scss";

const year = new Date().getFullYear();

interface FooterProps {
  className?: string;
}

const Footer: FC<FooterProps> = ({ className = "" }) => {
  return (
    <footer className={clsx(styles.root, className)}>
      <p className="container">&copy; {year}</p>
    </footer>
  );
};

export default Footer;
