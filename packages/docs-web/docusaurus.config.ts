import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const config: Config = {
  title: "Lunarys Documentation",
  tagline: "Full-stack guide for the Lunarys FHE protocol",
  favicon: "img/favicon.ico",
  future: {
    v4: true,
  },
  url: "https://docs.lunarys.dev",
  baseUrl: "/",
  organizationName: "zama-ai",
  projectName: "fhevm-react-template",
  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",
  themes: ["@docusaurus/theme-mermaid"],
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },
  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          editUrl:
            "https://github.com/zama-ai/fhevm-react-template/tree/main/packages/docs-web/",
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],
  themeConfig: {
    image: "img/docusaurus-social-card.jpg",
    navbar: {
      title: "Lunarys Docs",
      logo: {
        alt: "Lunarys Logo",
        src: "img/logo.svg",
      },
      items: [
        {
          type: "docSidebar",
          sidebarId: "protocolSidebar",
          position: "left",
          label: "Documentation",
        },
        {
          href: "https://github.com/zama-ai/fhevm-react-template",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      copyright: `Copyright © ${new Date().getFullYear()} Lunarys Protocol`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ["solidity"],
    },
    docs: {
      sidebar: {
        hideable: false,
        autoCollapseCategories: false,
      },
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
