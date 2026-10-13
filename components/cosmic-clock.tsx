'use client';
import { useState } from 'react';
import { preview } from '@/lib/site';

const C = 265;
const segments = [
 {name:'Day', detail:'06:21 – 17:54', from:-41, to:41, fill:'#dba052', opacity:.12, icon:'☀', short:'Day'},
 {name:'Sunset', detail:'05:54 PM', from:41, to:89, fill:'#e6ab4b', opacity:.23, icon:'☼', short:'Sunset'},
 {name:'Gulika Kalam', detail:'12:08 – 13:41', from:89, to:140, fill:'#8d5934', opacity:.24, icon:'◈', short:'Gulika'},
 {name:'Abhijit Muhurat', detail:preview.abhijit, from:140, to:192, fill:'#33643e', opacity:.63, icon:'❀', short:'Abhijit'},
 {name:'Rahu Kalam', detail:preview.rahu, from:192, to:239, fill:'#802a30', opacity:.66, icon:'♈', short:'Rahu'},
 {name:'Sunrise', detail:'06:21 AM', from:239, to:291, fill:'#bf8243', opacity:.36, icon:'☀', short:'Sunrise'},
 {name:'Night', detail:'06:24 PM – 06:23 AM', from:291, to:319, fill:'#132d47', opacity:.30, icon:'☾', short:'Night'},
] as const;
function point(r:number,angle:number){const a=(angle-90)*Math.PI/180;return [C+Math.cos(a)*r,C+Math.sin(a)*r] as const}
function sector(inner:number,outer:number,start:number,end:number){const [a,b]=point(outer,start),[c,d]=point(outer,end),[e,f]=point(inner,end),[g,h]=point(inner,start);return `M${a.toFixed(2)},${b.toFixed(2)} A${outer},${outer} 0 ${end-start>180?1:0} 1 ${c.toFixed(2)},${d.toFixed(2)} L${e.toFixed(2)},${f.toFixed(2)} A${inner},${inner} 0 ${end-start>180?1:0} 0 ${g.toFixed(2)},${h.toFixed(2)} Z`}
export function CosmicClock(){
 const [selected,setSelected]=useState<number|null>(null);
 const ticks=Array.from({length:120},(_,i)=>{const a=i*3;const [x1,y1]=point(i%10===0?246:251,a),[x2,y2]=point(257,a);return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={i%10===0?'#f5bf69':'#ce9b50'} strokeWidth={i%10===0?1.6:.65} opacity={i%10===0?.95:.38}/>});
 return <div className="cosmic-clock" aria-label="Illustrative circular day and timing diagram for Delhi, 13 October 2026"><svg viewBox="0 0 530 530" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Decorative interactive Panchang wheel displaying sample periods for 13 October 2026">
 <defs><radialGradient id="ring-aura"><stop stopColor="#fbb34c" stopOpacity=".12"/><stop offset=".7" stopColor="#a66722" stopOpacity=".04"/><stop offset="1" stopColor="#ecaa47" stopOpacity="0"/></radialGradient><linearGradient id="inner-gold" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#f8c670"/><stop offset=".55" stopColor="#94601f"/><stop offset="1" stopColor="#f3bc63"/></linearGradient></defs>
 <circle cx={C} cy={C} r="262" fill="url(#ring-aura)"/>
 {[259,247,239,225,214,202,126,119].map((r,i)=><circle key={r} cx={C} cy={C} r={r} fill="none" stroke={i%3===0?'#e9b25c':'#aa7339'} strokeWidth={i%3===0?1.5:.7} opacity={i===0?.6:i>5?.65:.45}/>)}
 {ticks}<circle cx={C} cy={C} r="220" stroke="#c48834" strokeWidth="2" opacity=".7" fill="#050b13" fillOpacity=".68"/>
 {segments.map((s,i)=>{const mid=(s.from+s.to)/2;const [tx,ty]=point(170,mid);const isSelected=i===selected;return <g key={s.name} role="button" tabIndex={0} aria-label={`${s.name}, ${s.detail}, illustrative timing`} onClick={()=>setSelected(isSelected?null:i)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelected(isSelected?null:i)}}} className="clock-sector" style={{cursor:'pointer'}}>
 <path d={sector(119,219,s.from,s.to)} fill={s.fill} fillOpacity={isSelected?Math.min(s.opacity+.28,.9):s.opacity} stroke={isSelected?'#ffd990':'#b98447'} strokeWidth={isSelected?1.7:.8}/>
 <circle cx={tx} cy={ty-18} r="24" fill="#101b20" opacity=".12"/>
 <text x={tx} y={ty-13} textAnchor="middle" className="wheel-icon" fill="#f5c575" fontSize="26">{s.icon}</text>
 <text x={tx} y={ty+8} textAnchor="middle" fill="#f7e9d4" className="wheel-label" fontSize="13" fontWeight="600">{s.short}</text>
 <text x={tx} y={ty+25} textAnchor="middle" fill="#e2d3be" fontSize="9.5" className="wheel-detail">{s.name==='Night'?'6:24 PM – 6:23 AM':s.detail}</text>
 </g>})}
 <circle cx={C} cy={C} r="118" fill="#080d13" stroke="#d4a254" strokeWidth="1.5"/>
 <circle cx={C} cy={C} r="111" fill="#0a1119" stroke="#875c29" strokeWidth="1"/>
 <circle cx={C} cy={C} r="101" fill="none" stroke="#c59450" strokeWidth=".55" opacity=".36"/>
 <text x={C} y="208" textAnchor="middle" fontSize="38" fill="#f3c168" className="wheel-icon">☀</text>
 <text x={C} y="254" textAnchor="middle" className="wheel-center-title" fill="#fff9ef" fontSize="25" fontFamily="Georgia, serif">{selected===null?'Tuesday':segments[selected].name}</text>
 <text x={C} y="281" textAnchor="middle" fill="#fff8ec" fontSize={selected===null?20:16} fontFamily="Georgia, serif">{selected===null?'13 Oct 2026':segments[selected].detail}</text>
 <text x={C} y="308" textAnchor="middle" className="wheel-detail" fill="#bcbfc2" fontSize="10">{selected===null?'DESIGN PREVIEW':'ILLUSTRATIVE WINDOW'}</text>
 <text x={C} y="322" textAnchor="middle" className="wheel-detail" fill="#a6aeb7" fontSize="9">{selected===null?'Tap a segment to explore':'Tap again to return'}</text>
 <circle cx={C} cy="8" r="3" fill="#fad98f"/><circle cx={C} cy="522" r="3" fill="#fad98f"/>
 <text x={C} y="24" textAnchor="middle" fill="#f1c77d" fontSize="9" letterSpacing="1">12 AM</text><text x={C} y="510" textAnchor="middle" fill="#f1c77d" fontSize="9" letterSpacing="1">12 PM</text>
 <text x="18" y={C} textAnchor="middle" fill="#e2b57c" fontSize="10">6 PM</text><text x="512" y={C} textAnchor="middle" fill="#e2b57c" fontSize="10">6 AM</text>
 </svg><span className="clock-aura" aria-hidden="true"/></div>
}
