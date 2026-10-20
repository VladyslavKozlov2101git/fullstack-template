import { FC } from "react";

import styles from "./Dashboard.module.scss";

interface DashboardProps {
  className?: string;
}

const Dashboard: FC<DashboardProps> = ({ className = "" }) => {
  return (
    <>
      {/* React 19 hoists <title>/<meta>/<link> into <head> — no helmet needed */}
      <title>Dashboard | App</title>
      <meta name="description" content="Your account overview at a glance." />
      <div className={`${styles.root} ${className}`} data-testid="dashboard">
        Dashboard
      </div>
    </>
  );
};

export default Dashboard;
