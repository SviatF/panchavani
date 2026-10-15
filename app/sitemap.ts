import type { MetadataRoute } from 'next';
import { approvedSeoRoutes } from '@/lib/seo-release-manifest';

// Intentionally empty until a human-reviewed per-URL release exists.
// Research candidates and AI drafts NEVER enter Google sitemaps.
export default function sitemap(): MetadataRoute.Sitemap {
  return approvedSeoRoutes().map(item=>({
    url:'https://panchavani.com'+item.path,
    lastModified:new Date(item.lastModified),
    changeFrequency:'weekly' as const,
  }));
}
