import { lazy } from "react";

export const rootAuthPath = "/auth";
export const rootMainPath = "/main";

const Dashboard = lazy(() => import("@pages/Dashboard")),
  Users = lazy(() => import("@pages/Users"));

export const mainPath = {
  dashboard: {
    component: Dashboard,
    path: `${rootMainPath}/dashboard`,
    slug: "/dashboard",
    name: "Dashboard",
  },
  users: {
    component: Users,
    path: `${rootMainPath}/users`,
    slug: "/users",
    name: "Users",
  },
};

export const authPath = {
  signIn: { path: `${rootAuthPath}/sign-in`, slug: "/sign-in", name: "Sign In" },
};
