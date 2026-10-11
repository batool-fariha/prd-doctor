import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: ["/", "/how-scoring-works"], disallow: ["/result/", "/api/"] },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
