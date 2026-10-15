import Link from 'next/link';
import { Flower2, ArrowUpRight } from 'lucide-react';
import { primaryNav } from '@/lib/site';
export function SiteFooter() {
 return <footer className="site-footer"><div className="footer-top"><div><div className="footer-brand"><Flower2 aria-hidden="true"/> PANCHAVANI</div><p>Harmony with cosmic time.<br/>Ancient wisdom for modern life.</p></div><nav aria-label="Footer navigation">{primaryNav.slice(1).map(item=><Link key={item.href} href={item.href}>{item.title}<ArrowUpRight size={12}/></Link>)}</nav></div><div className="footer-bottom"><span>© {new Date().getUTCFullYear()} PANCHAVANI</span><span>Calendar methodology and local observances are independently reviewed before publication.</span></div></footer>
}
