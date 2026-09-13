import type { MetadataRoute } from "next";
import { getPublicPageUrl } from "../src/lib/publicSiteUrl";

const publicPaths = [
  "/",
  "/ai-tutor",
  "/virtual-classroom",
  "/learn-german-b1-c2",
  "/privacy",
  "/terms",
  "/support",
  "/account-deletion",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return publicPaths.map((path) => ({
    url: getPublicPageUrl(path),
    changeFrequency: "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
