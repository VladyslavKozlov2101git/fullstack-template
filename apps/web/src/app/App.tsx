import { FC } from "react";
import { Toaster } from "react-hot-toast";
import "react-loading-skeleton/dist/skeleton.css";
import { Provider } from "react-redux";
import { RouterProvider } from "react-router/dom";

import { store } from "./store";

import "../assets/styles/main.scss";
import { router } from "../routes/routes";

import ErrorBoundary from "@shared/ErrorBoundary";

const App: FC = () => {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <RouterProvider router={router} />
        <Toaster position="bottom-right" />
      </Provider>
    </ErrorBoundary>
  );
};

export default App;
