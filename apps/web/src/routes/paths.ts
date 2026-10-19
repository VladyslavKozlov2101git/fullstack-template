import { lazy } from "react";

export const rootAuthPath = "/auth";
export const rootMainPath = "/main";

const Dashboard = lazy(() => import("@pages/Dashboard")),
  SignIn = lazy(() => import("@pages/SignIn")),
  SignUp = lazy(() => import("@pages/SignUp")),
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
  signIn: {
    component: SignIn,
    path: `${rootAuthPath}/sign-in`,
    slug: "/sign-in",
    name: "Sign In",
  },
  signUp: {
    component: SignUp,
    path: `${rootAuthPath}/sign-up`,
    slug: "/sign-up",
    name: "Sign Up",
  },
};
