const fallbackPublicSiteUrl = "https://deutschtrainer-engeln9-site.onrender.com";

/**
 * Canonical public-site origin. Set NEXT_PUBLIC_SITE_URL only after Render has verified the custom
 * domain; the Render hostname stays the safe fallback for previews and rollback.
 */
export function getPublicSiteUrl(): URL {
  return new URL(process.env.NEXT_PUBLIC_SITE_URL?.trim() || fallbackPublicSiteUrl);
}

export function getPublicSiteUrlString(): string {
  return getPublicSiteUrl().toString().replace(/\/$/u, "");
}

export function getPublicPageUrl(pathname: string): string {
  return new URL(pathname, getPublicSiteUrl()).toString();
}
