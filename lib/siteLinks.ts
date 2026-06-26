export const SITE_LINKS = {
  github: {
    type: "external" as const,
    url: "https://github.com/okayadaa",
  },
  linkedin: {
    type: "external" as const,
    url: "www.linkedin.com/in/adamarysmuniz-3348f93",
  },
} as const;

export type SiteLinkKey = keyof typeof SITE_LINKS;
export type SiteLink = (typeof SITE_LINKS)[SiteLinkKey];

export function handleSiteLink(link: SiteLink) {
  window.open(link.url, "_blank", "noopener,noreferrer");
}
