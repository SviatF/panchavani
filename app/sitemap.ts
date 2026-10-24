import type { MetadataRoute } from 'next';

// Required by Next.js output: export for metadata routes.
export const dynamic = 'force-static';
import { approvedSeoRoutes } from '@/lib/seo-release-manifest';

// Ten evergreen guides + separately human-reviewed per-URL day SEO permits.
// Research candidates, even science-approved days without SEO signoff, never enter.
export default function sitemap(): MetadataRoute.Sitemap {
  return approvedSeoRoutes().map(item=>({
    url:'https://panchavani.com'+item.path,
    lastModified:new Date(item.lastModified),
    changeFrequency:item.kind==='approved-daily-panchang'?'daily' as const:'weekly' as const,
  }));
}
