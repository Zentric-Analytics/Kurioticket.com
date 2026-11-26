import type { MetadataRoute } from "next";
import { crawlerCatalog } from "@/lib/botRegistry";
import { publicCrawlerPaths, publicCrawlerPrefixes } from "@/lib/botPolicy";
import { isStagingEnvironment } from "@/lib/stagingSafety";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const rules: MetadataRoute.Robots["rules"] = [{ userAgent: "*", disallow: "/" }];
  if (!isStagingEnvironment()) rules.unshift({
    userAgent: Object.values(crawlerCatalog).map(entry => entry.agent),
    disallow: ["/", "/flights/details", "/hotels/details", "/flights/handoff", "/hotels/handoff"],
    allow: [
      ...publicCrawlerPaths.map(path => path + "$"),
      ...publicCrawlerPrefixes, "/_next/image", "/api/content/faqs", "/api/content/homepage",
      "/flights/*$", "/hotels/*$", "/guides/*$", "/legal/*$",
    ],
  });
  return { rules };
}
