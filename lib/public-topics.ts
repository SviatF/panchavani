/** Public release can only read human-reviewed artifacts that match TWO
 * independently pinned file SHAs and approved local daily fact data.
 * Research/DeepSeek R2 drafts NEVER go here.
 */
import content from '@/data/approved-topic-pages.json';
import permits from '@/data/approved-topic-seo.json';
import {approvedCityDays} from '@/lib/public-panchang';
import {validateTopicContent,validateTopicSeo} from '@/lib/topic-release-policy.mjs';

export function approvedTopicArticles(){
 return validateTopicContent(content,approvedCityDays(),
  process.env.PANCHAVANI_APPROVED_TOPIC_RELEASE_SHA256);
}
export function approvedTopicSeoRoutes(){
 return validateTopicSeo(permits,approvedTopicArticles(),
  process.env.PANCHAVANI_APPROVED_TOPIC_SEO_SHA256);
}
export function publishedTopic(path:string){
 const listed=new Set(approvedTopicSeoRoutes().map(x=>x.path));
 if(!listed.has(path))return null;
 return approvedTopicArticles().find(x=>x.path===path)||null;
}
