export const SITE_LINKS = {
  github: {
    type: "external" as const,
    url: "https://github.com/okayadaa",
  },
  linkedin: {
    type: "external" as const,
    url: "https://www.linkedin.com/in/adamarysmuniz-3348f93/",
  },
  about: {
    type: "modal" as const,
  },
} as const;

export type SiteLinkKey = keyof typeof SITE_LINKS;

