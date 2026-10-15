'use client';
import {useState} from 'react';

/** Educational Panchang wheel. Equal sectors are NOT astronomical day windows. */
const CENTER=265;
const parts=[
 {name:'Tithi',description:'Lunar day',icon:'☾',color:'#b68846'},
 {name:'Vara',description:'Weekday',icon:'☀',color:'#bd8136'},
 {name:'Nakshatra',description:'Lunar mansion',icon:'✦',color:'#366a88'},
 {name:'Yoga',description:'Sun–Moon relationship',icon:'✧',color:'#466a50'},
 {name:'Karana',description:'Half lunar day',icon:'◈',color:'#805a8a'}
] as const;
function point(radius:number,degree:number){
 const a=(degree-90)*Math.PI/180;
 return [CENTER+Math.cos(a)*radius,CENTER+Math.sin(a)*radius] as const;
}
function sector(inner:number,outer:number,start:number,end:number){
 const [a,b]=point(outer,start),[c,d]=point(outer,end),
       [e,f]=point(inner,end),[g,h]=point(inner,start);
 return `M${a.toFixed(2)},${b.toFixed(2)} A${outer},${outer} 0 0 1 ${c.toFixed(2)},${d.toFixed(2)} L${e.toFixed(2)},${f.toFixed(2)} A${inner},${inner} 0 0 0 ${g.toFixed(2)},${h.toFixed(2)} Z`;
}
export function CosmicClock(){
 const [selected,setSelected]=useState<number|null>(null);
 const ticks=Array.from({length:120},(_,i)=>{
  const [a,b]=point(i%10===0?246:251,i*3),[c,d]=point(257,i*3);
  return <line key={i} x1={a} y1={b} x2={c} y2={d} stroke={i%10===0?'#f5bf69':'#ce9b50'} strokeWidth={i%10===0?1.6:.65} opacity={i%10===0?.95:.38}/>;
 });
 const chosen=selected===null?null:parts[selected];
 return <div className="cosmic-clock" aria-label="Educational illustration of the five components of Panchang; not a chart of today's astronomical timings">
  <svg viewBox="0 0 530 530" xmlns="http://www.w3.org/2000/svg" role="group" aria-label="Interactive five-limb Panchang diagram without day-specific times">
   <defs>
    <radialGradient id="ring-aura"><stop stopColor="#fbb34c" stopOpacity=".12"/><stop offset=".7" stopColor="#a66722" stopOpacity=".04"/><stop offset="1" stopColor="#ecaa47" stopOpacity="0"/></radialGradient>
   </defs>
   <circle cx={CENTER} cy={CENTER} r="262" fill="url(#ring-aura)"/>
   {[259,247,239,225,214,202,126,119].map((r,i)=><circle key={r} cx={CENTER} cy={CENTER} r={r} fill="none" stroke={i%3===0?'#e9b25c':'#aa7339'} strokeWidth={i%3===0?1.5:.7} opacity={i===0?.6:i>5?.65:.45}/>)}
   {ticks}
   <circle cx={CENTER} cy={CENTER} r="220" stroke="#c48834" strokeWidth="2" opacity=".7" fill="#050b13" fillOpacity=".68"/>
   {parts.map((item,i)=>{
    const start=-36+i*72,end=start+72,mid=(start+end)/2;
    const [x,y]=point(174,mid),isSelected=selected===i;
    return <g key={item.name} role="button" tabIndex={0} className="clock-sector"
      aria-label={`Learn about ${item.name}: ${item.description}`}
      onClick={()=>setSelected(isSelected?null:i)}
      onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setSelected(isSelected?null:i)}}}
      style={{cursor:'pointer'}}>
      <path d={sector(119,219,start,end)} fill={item.color} fillOpacity={isSelected?.8:.45}
        stroke={isSelected?'#ffe6aa':'#b98447'} strokeWidth={isSelected?1.9:.9}/>
      <text x={x} y={y-10} textAnchor="middle" className="wheel-icon" fill="#f8d08c" fontSize="25">{item.icon}</text>
      <text x={x} y={y+18} textAnchor="middle" className="wheel-label" fill="#fff2dc" fontSize="13" fontWeight="600">{item.name}</text>
    </g>;
   })}
   <circle cx={CENTER} cy={CENTER} r="118" fill="#080d13" stroke="#d4a254" strokeWidth="1.5"/>
   <circle cx={CENTER} cy={CENTER} r="111" fill="#0a1119" stroke="#875c29"/>
   <circle cx={CENTER} cy={CENTER} r="101" fill="none" stroke="#c59450" strokeWidth=".55" opacity=".36"/>
   <text x={CENTER} y="216" textAnchor="middle" fontSize="37" fill="#f3c168" className="wheel-icon">ॐ</text>
   <text x={CENTER} y="267" textAnchor="middle" className="wheel-center-title" fill="#fff9ef"
    fontSize={chosen?26:29} fontFamily="Georgia, serif">{chosen?.name??'Panchang'}</text>
   <text x={CENTER} y="291" textAnchor="middle" fill="#f6dba5" fontSize="13">
    {chosen?.description??'Five limbs of time'}</text>
   <text x={CENTER} y="316" textAnchor="middle" className="wheel-detail" fill="#a6aeb7" fontSize="10">
    {selected===null?'Select a limb to learn':'Select again to reset'}</text>
   <circle cx={CENTER} cy="8" r="3" fill="#fad98f"/>
   <circle cx={CENTER} cy="522" r="3" fill="#fad98f"/>
   <text x={CENTER} y="26" textAnchor="middle" fill="#f1c77d" fontSize="10" letterSpacing="2">FIVE ANGAS</text>
   <text x={CENTER} y="513" textAnchor="middle" fill="#f1c77d" fontSize="9" letterSpacing="1">THE HINDU CALENDAR</text>
  </svg>
  <span className="clock-aura" aria-hidden="true"/>
 </div>;
}
