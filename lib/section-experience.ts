/** Clearly scoped, educational copy for non-indexable section hubs.
 * No unpublished city/day, festival, fasting, or Muhurat data is asserted.
 * Each section answers a different reader need, instead of duplicating
 * the previous generic "Clarity before complexity" placeholder.
 */
export type GuideLink={title:string;description:string;href:string};
export type GuideBlock={heading:string;body:string};
export type GuideFaq={question:string;answer:string};
export type ExperienceSection={
  status:string;question:string;answer:string;
  basics:GuideBlock[];checklist:string[];
  links:GuideLink[];faqs:GuideFaq[];
};
export const sectionExperience={
 calendar:{
  status:'Month and day results appear here only after source review.',
  question:'How does a Hindu month relate to the dates on your clock?',
  answer:'A civil date starts at midnight. A Hindu lunar day (Tithi) follows the changing angle between the Moon and the Sun. Its transition can happen at any hour. A daily Panchang typically also needs the chosen city’s sunrise, and naming conventions vary across traditions.',
  basics:[
   {heading:'Start with a city',body:'Sunrise occurs at a different clock time in Delhi, Chennai and Mumbai even though all three use IST. A local calendar should identify its reference location.'},
   {heading:'Read the lunar fortnight',body:'Shukla Paksha is the waxing fortnight and Krishna Paksha is the waning fortnight. Tithi boundaries need not coincide with midnight.'},
   {heading:'Check which month system is used',body:'Regional calendars may identify or number months differently. Do not compare two festival dates without first checking their calendar convention.'}
  ],
  checklist:['Choose the city whose sunrise matters','Identify the civil month and year','Separate Tithi-at-sunrise from the time a Tithi ends','Verify the source’s calendar and observance method'],
  links:[
   {title:'Browse Panchang by city',description:'Find the ten city-specific educational guides.',href:'/panchang/'},
   {title:'Understand the five Angas',description:'Learn how Tithi, Vara, Nakshatra, Yoga and Karana are read.',href:'/learn/'},
   {title:'Explore regional traditions',description:'Find out why observance conventions can vary.',href:'/regional/'}
  ],
  faqs:[{question:'Why can the same Tithi span two civil dates?',answer:'A Tithi runs between two angular boundaries, not between two midnights. Its interval can cross midnight or sunrise; the date printed in a calendar depends on the observation and assignment method.'}]
 },
 festivals:{
  status:'No unreviewed festival dates are displayed.',
  question:'Why do Hindu festival dates change from year to year?',
  answer:'Many celebrations depend on lunar dates or specific observation windows, rather than a fixed Gregorian date. Astronomical timing is only one part of the answer: regional traditions can specify which part of the day determines the observance.',
  basics:[
   {heading:'Learn the occasion',body:'Start with the festival’s meaning and the tradition observing it. The same named celebration may be practiced differently across regions.'},
   {heading:'Understand its calendar rule',body:'A Tithi, lunar month, sunrise or another defined period can contribute to date selection. The relevant rule must be stated rather than guessed.'},
   {heading:'Confirm the local date',body:'Compare an independent calendar reference with the city and local observance convention before relying on a published date.'}
  ],
  checklist:['Identify the festival and regional tradition','Find the reference calendar’s stated observance rule','Check local sunrise and any relevant period','Separate traditions and history from a validated event date'],
  links:[
   {title:'Dussehra and its traditions',description:'Read the festival background without an unverified date claim.',href:'/festivals/dussehra/'},
   {title:'Regional traditions',description:'Compare different calendar conventions.',href:'/regional/'},
   {title:'Panchang fundamentals',description:'Understand what a Tithi actually measures.',href:'/learn/'}
  ],
  faqs:[{question:'Is a Tithi ending time always the festival date?',answer:'No. An event may use a separate observance window or a rule for which civil day is selected. A timestamp alone cannot establish every festival date.'}]
 },
 muhurat:{
  status:'Auspicious-date recommendations are not yet approved.',
  question:'What does a useful Muhurat result need to show?',
  answer:'A credible Muhurat result identifies the event, local place, named tradition and the exact eligible interval. A favourable-sounding lunar day is not sufficient: the relevant exclusions, time windows and source rules matter.',
  basics:[
   {heading:'Specify the event',body:'Wedding, home entry, vehicle purchase and business opening can require different traditional criteria. These should never share one generic scoring rule.'},
   {heading:'Match local timings',body:'Choose the event location. Then check sunrise, Tithi and any required Nakshatra, Yoga or other calculations at the relevant instant.'},
   {heading:'Show the complete rule',body:'A validated recommendation needs a documented tradition-specific rule and a time interval, not an unexplained “best day” label.'}
  ],
  checklist:['Choose one ceremony or activity','Define the city and calendar convention','Check the required time intervals and exclusions','Require the rule source before treating any result as advice'],
  links:[
   {title:'Wedding Muhurat',description:'Learn the criteria for a marriage window.',href:'/muhurat/wedding/'},
   {title:'Griha Pravesh',description:'Understand home-entry timing and tradition.',href:'/muhurat/griha-pravesh/'},
   {title:'Vehicle Purchase',description:'Which event and rules need to be specified?',href:'/muhurat/vehicle-purchase/'},
   {title:'Start a Business',description:'Explore rules for different opening events.',href:'/muhurat/start-business/'}
  ],
  faqs:[{question:'Why are specific auspicious dates not shown yet?',answer:'The source tradition, observer location and required ritual restrictions must be independently checked. PANCHAVANI currently has research calculations, not an approved set of recommended ceremony windows.'}]
 },
 vrat:{
  status:'Verified fasting dates and Parana windows are not yet available.',
  question:'What is the difference between a Tithi and a fasting date?',
  answer:'A Tithi marks an astronomical lunar interval. A Vrat is an observance governed by a tradition-specific calendar rule. Assigning a fast to a civil day may require local sunrise, a prescribed period and exceptions that are not apparent from the Tithi name alone.',
  basics:[
   {heading:'Which Vrat?',body:'A named fast may have a distinct calendar convention. Do not infer one observance’s rules from another.'},
   {heading:'Which city?',body:'Local sunrise and other required day periods can affect how a rule assigns an observance to a civil date.'},
   {heading:'When is Parana?',body:'Breaking a fast may use its own prescribed period. The ending time of the relevant Tithi should not automatically be described as a permitted Parana window.'}
  ],
  checklist:['Identify the specific fast and calendar school','Confirm the reference location','Check the cited day-assignment and Parana rules','Verify the date with a tradition-specific source'],
  links:[
   {title:'Learn about Tithi',description:'Understand the underlying lunar intervals.',href:'/learn/'},
   {title:'Choose a city',description:'Find an educational local-sunrise guide.',href:'/panchang/'},
   {title:'Festival context',description:'How observance dates depend on their rules.',href:'/festivals/'}
  ],
  faqs:[{question:'Can one universal Parana time be used everywhere?',answer:'No. The prescribed window depends on the observance rule and relevant local timings. A credible published result must name both.'}]
 },
 tools:{
  status:'Live astronomical calculators are in research validation.',
  question:'What can you check before trusting a Panchang time?',
  answer:'Look for three things: a defined location, a clear astronomical convention, and a source explaining how the result was calculated. A number without those details can be hard to reproduce or compare.',
  basics:[
   {heading:'Solar events',body:'Sunrise and sunset calculations depend on coordinates, horizon definition and atmospheric assumptions. The civil clock alone does not determine them.'},
   {heading:'Lunar intervals',body:'Tithi depends on the angular separation of the Sun and Moon. Nakshatra and Yoga additionally depend on a stated sidereal convention.'},
   {heading:'Calendar interpretation',body:'An exact astronomical transition is not automatically a festival date, fasting window or auspicious ceremony recommendation.'}
  ],
  checklist:['Check the city reference point','Check the IST and date conversion','Identify the sidereal reference and methodology','Seek source validation for any religious recommendation'],
  links:[
   {title:'Five Angas explained',description:'Build the basics before comparing calculations.',href:'/learn/'},
   {title:'Local Panchang guides',description:'See how location affects a daily reading.',href:'/panchang/'},
   {title:'Calendar interpretation',description:'Distinguish a Tithi transition from a calendar date.',href:'/calendar/'}
  ],
  faqs:[{question:'Why are there no live calculators on this page?',answer:'The calculation engine is under independent scientific validation. Until review is completed, this public section explains the calculation concepts without presenting preliminary output as certified.'}]
 },
 learn:{
  status:'Educational explanations only — no unverified daily values.',
  question:'What are the five Angas of a Panchang?',
  answer:'The five components are Tithi (lunar day), Vara (weekday), Nakshatra (lunar mansion), Yoga (a calculated Sun–Moon relationship) and Karana (half of a Tithi). They describe distinct parts of traditional timekeeping and should not be treated as interchangeable.',
  basics:[
   {heading:'Tithi & Karana',body:'A Tithi covers 12° of relative Moon–Sun motion; a Karana corresponds to 6°. Their exact start and end times are astronomical transitions.'},
   {heading:'Nakshatra & Yoga',body:'Traditional models divide the zodiac into 27 sections for Nakshatra and Yoga calculations. Their timings depend on the stated sidereal reference.'},
   {heading:'Vara & local sunrise',body:'Vara is the weekday in the chosen daily convention. A sunrise-based calendar day is not always equivalent to a midnight-to-midnight civil date.'},
   {heading:'Paksha',body:'Shukla Paksha is the waxing half of a lunar month, and Krishna Paksha the waning half. Paksha provides context for a Tithi.'}
  ],
  checklist:['Read the value active at local sunrise','Look for each element’s next transition time','Use IST consistently when comparing timestamps','Check regional rules before assigning an observance'],
  links:[
   {title:'What is Tithi?',description:'A complete explanation of lunar days, Paksha and sunrise.',href:'/learn/what-is-tithi/'},
   {title:'What is Nakshatra?',description:'Learn sidereal divisions and why methods disagree near boundaries.',href:'/learn/what-is-nakshatra/'},
   {title:'Why sunrise differs by city',description:'Understand local horizons and geocentric lunar intervals.',href:'/learn/sunrise-and-city-panchang/'},
   {title:'Delhi Panchang guide',description:'A practical example of the city and sunrise question.',href:'/panchang/delhi/'},
   {title:'Browse all ten cities',description:'Compare local explanatory guides.',href:'/panchang/'},
   {title:'Hindu calendar explained',description:'Connect lunar intervals to calendar months.',href:'/calendar/'}
  ],
  faqs:[{question:'Does a new Tithi begin at sunrise?',answer:'Not necessarily. Tithi boundaries occur when the Sun–Moon angular separation crosses a 12° step; that instant may fall before or after the local sunrise.'}]
 },
 regional:{
  status:'Regional guides explain conventions; unverified dates are not shown.',
  question:'Why can two Indian calendars label the same day differently?',
  answer:'Regional Hindu calendars can differ in month naming, lunar-month conventions and observance rules. Even where the astronomy agrees, a festival or Vrat may be assigned to a different civil day based on the chosen tradition.',
  basics:[
   {heading:'Shared civil time',body:'India Standard Time is used nationally, but calculated sunrise depends on the selected local coordinates.'},
   {heading:'Regional month conventions',body:'Different regions and traditions use varying month conventions. A festival date should always identify which one is being applied.'},
   {heading:'Local observance rules',body:'The date of a ceremony or fast can depend on which period of the day a specified Tithi must occupy. A bare phase timestamp is insufficient.'}
  ],
  checklist:['Select the region before reading a calendar rule','Confirm the specific tradition rather than assuming a state-wide rule','Use the correct city for solar-day events','Compare cited sources, not only headline dates'],
  links:[
   {title:'Uttar Pradesh',description:'City guides for Delhi’s neighbouring north-India region.',href:'/regional/uttar-pradesh/'},
   {title:'Maharashtra',description:'Explore local calendar context and Mumbai/Pune.',href:'/regional/maharashtra/'},
   {title:'Tamil Nadu',description:'Explore Chennai’s city-specific Panchang context.',href:'/regional/tamil-nadu/'},
   {title:'Karnataka',description:'Read the Bengaluru local-sunrise guide.',href:'/regional/karnataka/'},
   {title:'Gujarat',description:'Explore Ahmedabad’s calendar context.',href:'/regional/gujarat/'}
  ],
  faqs:[{question:'Does one state always use one Hindu calendar?',answer:'No. The state provides useful geographical context, but traditions may differ within it. A verified observance must identify the actual convention and its source.'}]
 }
} satisfies Record<string,ExperienceSection>;
