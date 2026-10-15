import type { MetadataRoute } from 'next';

// Google must be able to crawl a preview to see its existing meta noindex.
// Indexability is controlled by a separate page-level release gate.
export default function robots(): MetadataRoute.Robots {
  return {
    rules:{userAgent:'*',allow:'/'},
    sitemap:'https://panchavani.com/sitemap.xml',
  };
}
