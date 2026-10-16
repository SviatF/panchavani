/** Shared, fully server-rendered private admin design system.
 * No CDN, tracking, client JS, external fonts or new endpoints.
 * Skins existing authenticated HTML without touching JSON, D1, R2 or auth.
 */
export const ADMIN_UI_VERSION='panchavani-cinematic-ops-v1';

const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const NAV=[
 {group:'OVERVIEW',items:[
  {href:'/',label:'Command Center',symbol:'◈'},
  {href:'/science/overview',label:'Science gates',symbol:'◎'}
 ]},
 {group:'JPL RESEARCH',items:[
  {href:'/research/daily',label:'Daily explorer',symbol:'◷'},
  {href:'/research/ingest-status',label:'Import telemetry',symbol:'⇅'},
  {href:'/research/daily-brief',label:'SEO fact briefs',symbol:'⌁'}
 ]},
 {group:'EDITORIAL',items:[
  {href:'/ai',label:'DeepSeek studio',symbol:'✧'},
  {href:'/ai/quality-report',label:'Originality audit',symbol:'▤'},
  {href:'/ai/provider-status',label:'Provider health',symbol:'◉'}
 ]}
];
const PAGE=[
 ['/','Command Center','System overview'],
 ['/science/overview','Science gates','Astronomical evidence'],
 ['/research/daily','Daily explorer','Research candidates'],
 ['/research/ingest-status','Import telemetry','GitHub · R2 · D1'],
 ['/research/daily-brief','SEO fact briefs','Daily reader intent'],
 ['/ai','DeepSeek studio','Private editorial'],
 ['/ai/draft','Private draft','Editorial · Research'],
 ['/ai/quality-report','Originality audit','Editorial quality'],
 ['/ai/cache-health','Draft integrity','R2 source verification'],
 ['/ai/provider-status','Provider health','DeepSeek connectivity']
];
function meta(path){
 return PAGE.find(([p])=>p===path)||['','PANCHAVANI Operations','Private workspace'];
}
const CSS=`
:root{color-scheme:dark;--pv-base:#07080a;--pv-surface:#111318;--pv-ink:#f1ece4;--pv-muted:#999b9f;--pv-gold:#e3bb7b;--pv-line:rgba(225,190,135,.16);--pv-soft:rgba(247,204,142,.07)}
html{background:var(--pv-base)}
body{max-width:none!important;min-height:100vh!important;margin:0!important;padding:0!important;color:var(--pv-ink)!important;background:radial-gradient(ellipse 45% 42% at 87% 4%,rgba(176,118,56,.12),transparent 75%),radial-gradient(ellipse 60% 60% at 5% 70%,rgba(45,60,79,.14),transparent 75%),var(--pv-base)!important;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;letter-spacing:-.01em;-webkit-font-smoothing:antialiased}
body::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:0;opacity:.2;background-image:linear-gradient(90deg,transparent 98.7%,rgba(207,193,165,.12) 100%),linear-gradient(0deg,transparent 98.7%,rgba(207,193,165,.1) 100%);background-size:76px 76px;mask-image:linear-gradient(130deg,#000,transparent 73%)}
.pv-workspace{min-height:100vh;display:grid;grid-template-columns:254px minmax(0,1fr);isolation:isolate;position:relative}
.pv-sidebar{position:sticky;top:0;align-self:start;height:100vh;display:flex;flex-direction:column;gap:26px;padding:30px 17px 24px 19px;border-right:1px solid rgba(226,205,166,.1);background:linear-gradient(170deg,rgba(17,20,25,.98),rgba(8,9,12,.98));z-index:8;overflow-y:auto;scrollbar-width:thin;scrollbar-color:#4a3b2a transparent}
.pv-brand{display:flex;align-items:center;gap:12px;text-decoration:none!important;color:var(--pv-ink)!important;padding:6px 8px 17px}
.pv-symbol{width:38px;height:38px;border:1px solid rgba(236,196,128,.55);border-radius:11px;display:grid;place-items:center;transform:rotate(-8deg);background:radial-gradient(circle at 25% 15%,rgba(247,198,126,.21),transparent 70%)}
.pv-symbol:before{content:"✦";color:#f0d09b;font:22px Georgia,serif;transform:rotate(8deg)}
.pv-brand b{font-size:14px;letter-spacing:.19em;font-weight:750;display:block}
.pv-brand small{display:block;letter-spacing:.19em;font-size:9px;color:#a8a09a;margin-top:4px}
.pv-nav-group{margin:0 0 17px}
.pv-nav-label{display:block;margin:10px 14px;font-size:9px;letter-spacing:.2em;color:#797e84;font-weight:750}
.pv-nav-item{display:flex;align-items:center;gap:12px;border:1px solid transparent;border-radius:10px;margin:3px 0;padding:11px 12px;color:#aeb1b6!important;font-size:12px;font-weight:550;text-decoration:none!important;transition:color .18s,background .18s,border-color .18s}
.pv-nav-item:hover{color:#f3e4c9!important;background:rgba(216,174,109,.07)}
.pv-nav-item[aria-current=page]{color:#f4d4a4!important;background:linear-gradient(100deg,rgba(219,170,98,.15),rgba(219,170,98,.025));border-color:rgba(232,182,109,.21)}
.pv-nav-symbol{font:18px Georgia,serif;display:grid;place-items:center;width:22px;color:#c9a573}
.pv-side-foot{margin-top:auto;border:1px solid rgba(216,181,126,.16);border-radius:13px;padding:15px;background:linear-gradient(145deg,rgba(226,180,113,.08),transparent)}
.pv-side-foot .pv-on{font-size:10px;letter-spacing:.17em;color:#a2a7ab}
.pv-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#cda86c;box-shadow:0 0 15px rgba(238,175,88,.5);margin-right:7px}
.pv-side-foot p{margin:8px 0 0;font-size:12px;line-height:1.55;color:#d1c9bf}
.pv-side-foot small{color:#8e9298;font-size:10px;line-height:1.6;display:block;margin-top:10px}
.pv-stage{min-width:0;display:flex;flex-direction:column}
.pv-topbar{height:69px;flex-shrink:0;display:flex;justify-content:space-between;align-items:center;gap:15px;padding:0 clamp(18px,3.5vw,56px);border-bottom:1px solid rgba(235,207,159,.1);background:rgba(9,11,14,.82);backdrop-filter:blur(18px);position:sticky;top:0;z-index:7}
.pv-path{display:flex;gap:10px;align-items:center;min-width:0;font-size:12px;color:#92969c}
.pv-path strong{color:#f1d4a8;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pv-separator{color:#5c6167}
.pv-top-status{white-space:nowrap;border:1px solid var(--pv-line);border-radius:100px;padding:7px 12px;font-size:10px;color:#d3bea0;background:rgba(220,171,97,.055);letter-spacing:.065em}
.pv-content{position:relative;width:min(1290px,100%);margin:0 auto!important;padding:clamp(24px,3vw,44px) clamp(17px,3.3vw,54px) 85px!important;flex:1;min-width:0;max-width:none!important}
.pv-content>header{max-width:none;border:1px solid var(--pv-line);border-radius:13px;background:rgba(19,20,23,.88);padding:16px 20px;margin:0 0 24px}
.pv-content>header strong{font-size:16px}
.pv-content>main{padding:0!important;max-width:none!important;margin:0!important}
.pv-content>nav{font-size:12px;margin:0 0 23px;color:#c8a877}
.pv-content h1{font-family:Georgia,"Times New Roman",serif!important;font-size:clamp(33px,3.4vw,52px)!important;font-weight:normal!important;letter-spacing:-.037em!important;line-height:1.1!important;margin:8px 0 18px!important;color:#f8eee1!important}
.pv-content h2{font-family:Georgia,"Times New Roman",serif!important;letter-spacing:-.024em!important;color:#f4e5d2!important;font-weight:normal!important}
.pv-content p,.pv-content li{color:#bcb8b0;line-height:1.7}
.pv-content section{background:linear-gradient(145deg,rgba(27,27,29,.94),rgba(16,17,21,.94))!important;border:1px solid rgba(227,189,130,.17)!important;border-radius:17px!important;box-shadow:0 18px 52px rgba(0,0,0,.12);padding:clamp(18px,2.1vw,27px)!important}
.pv-content .cards{gap:15px!important}
.pv-content .cards section{margin:0!important}
.pv-content .cards strong,.pv-content .stat strong{color:#f0d4ab!important}
.pv-content a{color:#e1bf88}
.pv-content a:hover{color:#ffe0a4}
.pv-content button,.pv-content input[type=submit]{min-height:42px;border-radius:9px!important;box-shadow:none!important;background:linear-gradient(112deg,#ebc58a,#ca9658)!important;border:1px solid rgba(255,216,150,.45)!important;color:#21160b!important;font-weight:720;transition:transform .15s,filter .15s}
.pv-content button:hover:not(:disabled){transform:translateY(-1px);filter:brightness(1.1)}
.pv-content button:disabled{opacity:.45;cursor:not-allowed}
.pv-content input:not([type=hidden]),.pv-content select,.pv-content textarea{background:#0b0d11!important;border:1px solid #504538!important;color:#f2e7d5!important;border-radius:8px!important;max-width:100%}
.pv-content input:focus-visible,.pv-content select:focus-visible,.pv-content button:focus-visible,.pv-nav-item:focus-visible{outline:2px solid #e8bc7d;outline-offset:3px}
.pv-content table{width:100%}.pv-content th{color:#dcb982!important;text-transform:uppercase;font-size:10px!important;letter-spacing:.09em}.pv-content td{color:#c7c3b8}
.pv-content code{font-size:.87em;overflow-wrap:anywhere;color:#d8bc92}
.pv-content article{border-radius:12px}
.pv-content footer{font-size:11px!important;color:#7d838a!important}
.pv-content .eyebrow{color:#dcb276!important;letter-spacing:.18em}
.pv-content .warning,.pv-content .alert,.pv-content .notice{border:1px solid rgba(233,175,100,.28)!important;border-left:3px solid #e3b46e!important;border-radius:10px!important;background:rgba(179,112,34,.10)!important;color:#eacba3!important}
.pv-content .grid{gap:13px!important}
.pv-content .grid article,.pv-content .card,.pv-content .stat{background:#101115!important;border:1px solid var(--pv-line)!important;border-radius:11px!important}
.pv-hero{position:relative;overflow:hidden;isolation:isolate;padding:33px clamp(22px,3vw,40px)!important;min-height:235px;border-radius:20px;border:1px solid rgba(237,192,123,.24);background:linear-gradient(116deg,rgba(26,26,29,.97) 20%,rgba(38,31,24,.84) 67%,rgba(27,24,24,.99));margin-bottom:23px}
.pv-hero::before{content:"";position:absolute;right:-65px;top:-135px;width:390px;height:390px;border-radius:50%;border:1px solid rgba(226,177,104,.25);box-shadow:0 0 0 30px rgba(213,170,104,.025),0 0 0 78px rgba(213,170,104,.02),0 0 0 138px rgba(213,170,104,.014);z-index:-1;animation:pv-drift 18s ease-in-out infinite alternate}
.pv-hero::after{content:"";position:absolute;right:65px;top:-17px;width:1px;height:340px;background:linear-gradient(transparent,rgba(244,200,134,.36),transparent);transform:rotate(36deg);z-index:-1}
.pv-eyebrow{font-size:10px!important;letter-spacing:.24em;text-transform:uppercase;color:#e5c38d!important;font-weight:700}
.pv-hero h1{max-width:690px;font-size:clamp(36px,4.6vw,65px)!important;margin:12px 0 14px!important}
.pv-hero p{max-width:640px;margin:0;font-size:14px;color:#c7c0b4}
.pv-herotags{display:flex;flex-wrap:wrap;gap:9px;margin-top:25px}
.pv-tag{border:1px solid rgba(227,189,130,.25);border-radius:99px;font-size:10px;padding:7px 12px;color:#dbbf96;letter-spacing:.07em;background:rgba(214,169,97,.065)}
.pv-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:20px 0 29px}
.pv-metric{padding:21px!important;border-radius:14px;border:1px solid var(--pv-line);background:linear-gradient(135deg,rgba(23,24,28,.98),rgba(13,14,17,.97));min-height:127px}
.pv-metric span{font-size:10px;color:#a19d96;letter-spacing:.1em;text-transform:uppercase}
.pv-metric strong{display:block;font:normal 32px Georgia,serif;color:#f8e4c3;margin:12px 0 3px}
.pv-metric small{font-size:10px;color:#9b9d9b}
.pv-sectiontitle{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:29px 0 14px}
.pv-sectiontitle h2{margin:0;font-size:27px}
.pv-sectiontitle a{font-size:12px;text-decoration:none}
.pv-pipeline{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.pv-pipe{padding:19px;border:1px solid var(--pv-line);border-radius:13px;background:rgba(18,20,24,.96);position:relative;min-height:150px}
.pv-pipe small{color:#ac8f6a;font-size:11px}.pv-pipe h3{color:#f0e5d7;font-size:15px;font-weight:600;margin:15px 0 9px}
.pv-pipe p{font-size:12px;margin:0;line-height:1.55}
.pv-pipe:after{content:"›";color:#bd9a68;position:absolute;right:8px;top:8px;font-size:19px}
.pv-feature-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px}
.pv-feature{padding:22px;border:1px solid var(--pv-line);border-radius:14px;background:linear-gradient(130deg,rgba(25,26,30,.96),rgba(14,15,18,.99));text-decoration:none!important;display:flex;align-items:flex-start;justify-content:space-between;gap:20px}
.pv-feature:hover{border-color:rgba(236,191,117,.45);background:linear-gradient(130deg,rgba(40,34,29,.96),rgba(17,18,21,.99))}
.pv-feature strong{font-size:16px;color:#f5e8d8;display:block;margin:0 0 9px}
.pv-feature span{font-size:12px;color:#a7a9aa;line-height:1.6;display:block}
.pv-feature em{color:#e7bc7d;font:23px Georgia,serif;font-style:normal}
.pv-advanced{margin-top:30px;padding:2px 19px 21px;border:1px solid var(--pv-line);border-radius:15px;background:#111217}
.pv-advanced>summary{padding:19px 0;cursor:pointer;color:#d6c7b3;font-weight:600}
.pv-advanced>summary:focus-visible{outline:2px solid #e8bc7d}
.pv-caption{font-size:12px;color:#9da0a2}
.pv-content .pv-advanced section{margin-top:15px}
@keyframes pv-drift{from{transform:translateY(0)}to{transform:translateY(26px)}}
@media(max-width:1100px){.pv-metrics,.pv-pipeline{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:820px){.pv-workspace{display:block}.pv-sidebar{position:relative;height:auto;padding:13px 15px;overflow:visible;gap:7px;border-right:0;border-bottom:1px solid var(--pv-line);background:rgba(12,13,17,.99)}.pv-brand{padding:3px 6px}.pv-nav{display:flex;gap:9px;overflow-x:auto;scrollbar-width:none;margin:2px 0}.pv-nav-group{display:contents}.pv-nav-label,.pv-side-foot{display:none}.pv-nav-item{white-space:nowrap;border-color:rgba(227,189,130,.1);padding:9px 11px}.pv-topbar{top:0;height:52px;padding:0 16px}.pv-content{padding:24px 16px 55px!important}}
@media(max-width:600px){.pv-metrics,.pv-pipeline,.pv-feature-grid{grid-template-columns:1fr}.pv-top-status{display:none}.pv-hero{min-height:205px}.pv-content .cards{grid-template-columns:1fr!important}.pv-content .grid{grid-template-columns:1fr!important}.pv-content>header{flex-direction:column;align-items:flex-start}.pv-content>main{overflow-wrap:anywhere}}
@media(prefers-reduced-motion:reduce){.pv-hero::before{animation:none}.pv-nav-item,.pv-content button{transition:none}}
`;
function sidebar(path){
 const groups=NAV.map(group=>'<div class="pv-nav-group"><span class="pv-nav-label">'+esc(group.group)+'</span>'+
  group.items.map(item=>'<a class="pv-nav-item" href="'+item.href+'"'+
   (path===item.href?' aria-current="page"':'')+'><span class="pv-nav-symbol" aria-hidden="true">'+
   esc(item.symbol)+'</span>'+esc(item.label)+'</a>').join('')+'</div>').join('');
 return '<aside class="pv-sidebar" aria-label="Private admin sidebar">'+
  '<a class="pv-brand" href="/" aria-label="PANCHAVANI Command Center">'+
  '<span class="pv-symbol" aria-hidden="true"></span><span><b>PANCHAVANI</b><small>CONTROL SYSTEM</small></span></a>'+
  '<nav class="pv-nav" aria-label="Operations">'+groups+'</nav>'+
  '<div class="pv-side-foot"><div class="pv-on"><i class="pv-dot"></i> PRIVATE WORKSPACE</div>'+
  '<p>Calculated ≠ verified<br>Verified ≠ published</p>'+
  '<small>Cloudflare Access · Protected operations · No public indexing</small></div></aside>';
}
export async function skinAdminResponse(response,request){
 if(!response.headers.get('Content-Type')?.toLowerCase().includes('text/html')||
    response.status===403||response.status>=500||
    !['GET','POST'].includes(request.method))return response;
 const origin=new URL(request.url);
 if(origin.hostname!=='admin.panchavani.com')return response;
 const source=await response.text();
 if(!source.includes('</head>')||!source.includes('</body>'))return new Response(source,response);
 const [path,title,context]=meta(origin.pathname);
 const upper='<div class="pv-workspace">'+sidebar(path)+
  '<div class="pv-stage"><div class="pv-topbar"><div class="pv-path"><span>PRIVATE OPS</span>'+
  '<span class="pv-separator">/</span><strong>'+esc(title)+'</strong>'+
  '<span class="pv-separator">·</span><span>'+esc(context)+'</span></div>'+
  '<span class="pv-top-status"><i class="pv-dot"></i>RESEARCH ONLY · SECURE</span></div>'+
  '<div class="pv-content">';
 let text=source.replace('</head>','<style data-panchavani-theme="'+ADMIN_UI_VERSION+'">'+CSS+'</style></head>');
 text=text.replace(/<body(\s[^>]*)?>/i,x=>x+upper);
 text=text.replace('</body>','</div></div></div></body>');
 const headers=new Headers(response.headers);
 headers.delete('Content-Length');
 return new Response(text,{status:response.status,statusText:response.statusText,headers});
}
