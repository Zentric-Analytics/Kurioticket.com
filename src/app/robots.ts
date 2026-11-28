import type { MetadataRoute } from "next";
import { crawlerCatalog, recognizedCrawlerAgents } from "@/lib/botRegistry";
import { publicCrawlerPaths, publicCrawlerPrefixes } from "@/lib/botPolicy";
import { isStagingEnvironment } from "@/lib/stagingSafety";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const rules: MetadataRoute.Robots["rules"] = [{ userAgent: "*", disallow: "/" }];
  const staging = isStagingEnvironment();
  rules.unshift({
    userAgent: staging ? recognizedCrawlerAgents : Object.values(crawlerCatalog).map(entry => entry.agent),
    disallow: ["/", "/flights/details", "/hotels/details", "/flights/handoff", "/hotels/handoff"],
    allow: [
      ...publicCrawlerPaths.map(path => path + "$"),
      // A crawler matches the query string too. Keep these allowances scoped to exact public paths.
      ...(staging ? publicCrawlerPaths.map(path => path + "?") : []),
      ...publicCrawlerPrefixes, "/_next/image", "/api/content/faqs", "/api/content/homepage",
      "/flights/*$", "/hotels/*$", "/guides/*$", "/legal/*$",
    ],
  });
  return { rules };
}
