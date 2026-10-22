export const PROJECT_NAME = 'PANCHAVANI';
export const ASSET = (name: string) => `/imgs/${name}.webp`;

export const primaryNav = [
  { title: 'Today', href: '/' }, { title: 'Panchang', href: '/panchang/' },
  { title: 'Calendar', href: '/calendar/' }, { title: 'Festivals', href: '/festivals/' },
  { title: 'Muhurat', href: '/muhurat/' }, { title: 'Vrat', href: '/vrat/' },
  { title: 'Tools', href: '/tools/' }, { title: 'Learn', href: '/learn/' },
  { title: 'Regional', href: '/regional/' },
];

export const featureNav = [
  { label: 'Panchang', desc: 'Local city guides', icon: 'sun', href: '/panchang/' },
  { label: 'Hindu Calendar', desc: 'Understand lunar months', icon: 'calendar', href: '/calendar/' },
  { label: 'Festivals', desc: 'Meaning & traditions', icon: 'flame', href: '/festivals/' },
  { label: 'Muhurat Finder', desc: 'Understand timing rules', icon: 'compass', href: '/muhurat/' },
  { label: 'Vrat & Fasting', desc: 'Fasting conventions', icon: 'flower', href: '/vrat/' },
  { label: 'Horoscope', desc: 'Calendar concepts', icon: 'orbit', href: '/learn/' },
  { label: 'Tools', desc: 'Astronomy explained', icon: 'calculator', href: '/tools/' },
  { label: 'Regional', desc: 'Regional guides', icon: 'sparkle', href: '/regional/' },
] as const;

export const highlights = [
  {key:'tithi',label:'TITHI',title:'The Lunar Day',time:'',body:'How the changing Sun–Moon angle shapes the lunar calendar.',img:'highlight-tithi',tone:'gold'},
  {key:'nakshatra',label:'NAKSHATRA',title:'Lunar Mansions',time:'',body:'Understand the traditional divisions of the Moon’s path.',img:'highlight-nakshatra',tone:'blue'},
  {key:'abhijit',label:'SOLAR DAY',title:'Local Sunrise',time:'',body:'Why each city needs its own precisely established sunrise.',img:'highlight-abhijit',tone:'green'},
  {key:'rahu',label:'TRADITIONS',title:'Daily Periods',time:'',body:'Explore how calendar schools interpret different periods.',img:'highlight-rahu',tone:'red'}
] as const;

export const muhuratCards = [
  { slug: 'wedding', title: 'Wedding Muhurat', img: 'card-wedding', icon: 'rings', desc: 'Understand marriage timing rules' },
  { slug: 'griha-pravesh', title: 'Griha Pravesh', img: 'card-griha-pravesh', icon: 'home', desc: 'Explore home-entry traditions' },
  { slug: 'vehicle-purchase', title: 'Vehicle Purchase', img: 'card-vehicle-purchase', icon: 'car', desc: 'Understand purchase-date rules' },
  { slug: 'start-business', title: 'Start a Business', img: 'card-start-business', icon: 'briefcase', desc: 'Explore business-opening traditions' },
] as const;

export const regionalCards = [
  {slug:'uttar-pradesh',name:'Uttar Pradesh',style:'reg-up',img:'region-uttar-pradesh'},
  {slug:'maharashtra',name:'Maharashtra',style:'reg-mh',img:'region-maharashtra'},
  {slug:'tamil-nadu',name:'Tamil Nadu',style:'reg-tn',img:'region-tamil-nadu'},
  {slug:'karnataka',name:'Karnataka',style:'reg-ka',img:'region-karnataka'},
  {slug:'gujarat',name:'Gujarat',style:'reg-gj',img:'region-gujarat'},
] as const;

export const sectionData = {
  panchang: {title:'Daily Panchang',eyebrow:'THE FIVE LIMBS OF TIME',text:'Discover Tithi, Vara, Nakshatra, Yoga and Karana, alongside sunrise, sunset and traditionally significant daily periods.',feature:'Local sunrise and lunar transitions are calculated using a specific location and date.',image:'highlight-abhijit'},
  calendar: {title:'Hindu Calendar',eyebrow:'TIME THROUGH TRADITION',text:'Understand lunar months, the two Pakshas and how a local sunrise affects a Hindu calendar date.',feature:'A date grid without validated local calculations cannot establish the Tithi or a festival observance.',image:'hero-main-bg'},
  festivals: {title:'Festivals & Celebrations',eyebrow:'STORIES OF THE YEAR',text:'Discover the meaning of Hindu celebrations and learn why their dates depend on calendar conventions.',feature:'Our editorial festival guides will cite the conventions used for every date.',image:'festival-dussehra'},
  muhurat: {title:'Muhurat Planner',eyebrow:'MOMENTS THAT MATTER',text:'Understand how different ceremonies require their own local timing and tradition-specific rule checks.',feature:'Candidate timings will not be shown as authoritative until they have been independently validated.',image:'card-wedding'},
  vrat: {title:'Vrat & Fasting',eyebrow:'RITUALS AND OBSERVANCES',text:'Understand how a Vrat is assigned to a civil day and why Parana requires its own verified rule.',feature:'City-specific fasting windows and published methodology are planned.',image:'highlight-tithi'},
  tools: {title:'Astronomy & Panchang Tools',eyebrow:'TIME, EXPLAINED',text:'Learn which inputs and conventions a reproducible Panchang calculation requires.',feature:'Research calculations are not yet exposed as verified public calculators.',image:'highlight-nakshatra'},
  learn: {title:'Learn Panchang',eyebrow:'ANCIENT WISDOM · CLEAR EXPLANATIONS',text:'A practical library explaining the language, astronomy and traditions of Hindu calendars.',feature:'Every guide will distinguish astronomical calculations from regional ritual conventions.',image:'highlight-nakshatra'},
  regional: {title:'India’s Regional Traditions',eyebrow:'A CULTURE OF MANY CALENDARS',text:'Celebrate the diversity of Indian observances across regions, languages and lunar calendar traditions.',feature:'Regions will carry explicit local calendar methods instead of templated identical text.',image:'hero-main-bg'},
} as const;
export type SectionSlug = keyof typeof sectionData;
