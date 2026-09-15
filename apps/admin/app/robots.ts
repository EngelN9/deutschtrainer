import type { MetadataRoute } from "next";
import { getPublicSiteUrlString } from "../src/lib/publicSiteUrl";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/admin"],
      },
    ],
    sitemap: `${getPublicSiteUrlString()}/sitemap.xml`,
  };
}
