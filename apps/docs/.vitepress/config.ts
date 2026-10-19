import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Docs",
  description: "Project documentation",
  themeConfig: {
    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Getting started", link: "/" },
          { text: "Architecture", link: "/architecture" },
        ],
      },
    ],
  },
});
