import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  protocolSidebar: [
    "intro",
    "quickstart",
    "deployments",
    "tutorial",
    {
      type: "category",
      label: "Architecture",
      collapsible: false,
      items: [
        "architecture/contracts",
        "architecture/frontend",
        "architecture/relayer",
      ],
    },
    {
      type: "category",
      label: "Operations",
      collapsible: false,
      items: ["operations/testing"],
    },
  ],
};

export default sidebars;
