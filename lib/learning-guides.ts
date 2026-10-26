/** Original English educational guides, not generated city/day predictions.
 * Public preview is deliberately noindex until independently reviewed for SEO.
 * Factual methodology is grounded in official government PANCHANG explanations.
 */
export type LearningGuide={
 slug:string;title:string;eyebrow:string;description:string;summary:string;
 readTime:string;lead:string;keyPoint:string;
 sections:{title:string;paragraphs:string[];list?:string[]}[];
 workedExample:{title:string;setup:string;steps:string[];conclusion:string};
 commonMistakes:string[];
 faqs:{question:string;answer:string}[];
 references:{label:string;url:string;detail:string}[];
};
export const officialPanchangReferences=[
 {label:'Positional Astronomy Centre — Rashtriya Panchang methodology',
  url:'https://packolkata.imd.gov.in/panchang/en/explanation',
  detail:'Official definitions of Tithi, Nakshatra, Yoga, Karana, local sunrise and the adopted central reference station.'},
 {label:'India Meteorological Department — Rashtriya Panchang',
  url:'https://mausam.imd.gov.in/responsive/rashtriyPanchang.php',
  detail:'Government publisher, scope of the annual Panchang and explanations of modern calculations.'}
] satisfies LearningGuide['references'];

export const learningGuides={
 'what-is-tithi':{
  slug:'what-is-tithi',
  title:'What Is Tithi? Lunar Days, Paksha and Sunrise Explained',
  eyebrow:'THE LUNAR CALENDAR',readTime:'8 MIN READ',
  description:'Understand how a Tithi is measured, why it differs from a civil date, and how to compare Panchang sources without confusing sunrise and lunar transitions.',
  summary:'A Tithi is defined by a 12° change in the angular separation of the Moon from the Sun. It is not a fixed 24-hour clock day.',
  lead:'When a calendar says “Shashthi” or “Ekadashi,” it names a lunar interval, not a fixed block from midnight to midnight. That distinction changes how to interpret a daily Panchang, compare two cities and understand why observance dates need additional rules.',
  keyPoint:'A Tithi ending at a clock time is an astronomical boundary. Assigning it to a civil date is a separate calendar decision.',
  sections:[
   {title:'What the 12-degree rule measures',paragraphs:[
    'The angular separation of the Moon from the Sun, measured along the ecliptic, changes continuously as the Moon travels around Earth. Each successive 12-degree segment corresponds to one Tithi. Thirty such segments span the full 360-degree cycle.',
    'The time needed to pass one segment changes because the apparent motions of the Sun and Moon are not constant. For that reason, a Tithi can be shorter or longer than 24 hours, and its beginning and end do not need to fall at sunrise or midnight.',
    'A good Panchang should distinguish the Tithi active at a local reference time from the exact instant at which that Tithi ends. Printing only a name without the reference instant loses useful information.'
   ],list:['Tithi: 12° interval of the changing Sun–Moon longitude difference','Karana: half that angular interval, 6°','Civil date: a date defined by a local clock/calendar, not by the lunar angle']},
   {title:'How Shukla and Krishna Paksha fit together',paragraphs:[
    'Shukla Paksha is the waxing half of the lunar cycle, progressing toward the full moon; Krishna Paksha is the waning half, progressing toward the new moon. Both contain named Tithis, and the same ordinal name can occur in each Paksha.',
    'An Amanta lunar month is reckoned from new moon to new moon, while a Purnimanta naming convention reckons month boundaries differently. Two publishers may agree about the lunar angle but display a different month name. Always compare the underlying calendar convention before calling either calendar wrong.'
   ]},
   {title:'Why sunrise matters without changing the Moon',paragraphs:[
    'The astronomical instant of a geocentric lunar transition is not postponed when you select a different city. Delhi and Chennai do, however, see sunrise at different instants. The Tithi present at each city’s sunrise can therefore differ near a boundary.',
    'Festival or fasting observances cannot be inferred from the Tithi-at-sunrise field alone. Some traditions use a different portion of the day, and special fasting rules may require further tests. A rigorous result records the calendar system, city, relevant boundary and source rule.'
   ]}
  ],
  workedExample:{
   title:'Worked reading example — not a prediction',
   setup:'Imagine a Tithi ending at 07:10 IST. City A has sunrise at 06:20 IST, while City B has sunrise at 07:25 IST. These times are fictional and only demonstrate the logic.',
   steps:['At City A’s sunrise, the earlier Tithi is still active because 06:20 precedes 07:10.','At City B’s sunrise, the next Tithi is already active because 07:25 follows 07:10.','The astronomical transition happened once; the two cities simply sampled it at different sunrises.'],
   conclusion:'A useful city-specific Panchang identifies both the precise boundary and the local sunrise used to interpret it.'
  },
  commonMistakes:['Assuming that a lunar day is exactly 24 hours','Using a Tithi ending time as an automatic festival-date recommendation','Confusing a lunar month naming convention with an actual change of angular boundary'],
  faqs:[
   {question:'Can one Tithi appear on two consecutive civil dates?',answer:'Yes. Lunar boundaries follow changing angular motion, so a Tithi can intersect portions of more than one calendar date. Which date is printed depends on the publisher’s reference rules.'},
   {question:'Does a Tithi change at midnight?',answer:'Only by coincidence. Its transition occurs when the underlying Sun–Moon longitude difference crosses the next 12-degree boundary.'},
   {question:'Does a matching Tithi prove two Panchangs use the same method?',answer:'No. Rounding, reference epoch, ephemeris, time scale and lunar month convention may still differ. Compare both values and the source method.'}
  ],references:officialPanchangReferences
 },
 'what-is-nakshatra':{
  slug:'what-is-nakshatra',
  title:'What Is Nakshatra? The 27 Lunar Mansions Explained',
  eyebrow:'SIDEREAL LUNAR MOTION',readTime:'9 MIN READ',
  description:'Learn how the 27 Nakshatras divide the sidereal zodiac, why ayanamsa changes numerical results, and how to compare a local Panchang.',
  summary:'A Nakshatra identifies one of 27 equal divisions of the sidereal ecliptic, each 13°20′ wide, used to describe the Moon’s apparent sidereal position.',
  lead:'Nakshatra is often translated as a “lunar mansion,” but a trustworthy calendar should go beyond the name. Its astronomical meaning depends on the Moon’s sidereal longitude, the 27-part division of the circle and the ayanamsa convention used to establish the reference direction.',
  keyPoint:'A Nakshatra name without the adopted sidereal frame, method and transition clock is insufficient for high-precision comparison.',
  sections:[
   {title:'Dividing the sidereal ecliptic into 27',paragraphs:[
    'A full circle contains 360 degrees. The conventional Nakshatra system divides it into 27 equal sectors, each spanning 13 degrees and 20 arcminutes. A calculation first determines the Moon’s ecliptic longitude in a chosen reference frame and then identifies the sector that contains that position.',
    'This classification is different from the 12-sign Rashi system. The two systems can be displayed together, but a Rashi transition and a Nakshatra transition occur at different boundaries. Neither can substitute for the other in the Panchang.',
    'The Moon moves continuously, so the Nakshatra present at local sunrise may not be the Nakshatra for the entire civil date. Good timekeeping displays the ending instant as well as the initial label.'
   ],list:['27 Nakshatra sectors cover 360° of sidereal longitude','Each sector spans 13°20′','The relevant value is the sidereal longitude of the Moon, not the civil date number']},
   {title:'Ayanamsa is not a cosmetic setting',paragraphs:[
    'Tropical longitude and sidereal longitude refer to different astronomical frames. Ayanamsa expresses their angular offset according to a specified convention. The precise choice and implementation of an ayanamsa can shift a sidereal boundary crossing, especially when the Moon is near the edge of a sector.',
    'Two sources may use the general term “Lahiri” yet still differ because of ephemerides, precession reference, time-scale conversions, nutation or numerical rounding. A close agreement in names on one date is a useful check, not proof that all event times match.',
    'This is why PANCHAVANI keeps JPL and Swiss results separate during scientific review. The figures have to be reconciled under a stated method before publishing claimed precise Nakshatra times.'
   ]},
   {title:'Using Nakshatra responsibly in a daily calendar',paragraphs:[
    'Begin with the city and date. Find the reference sunrise, the Nakshatra active at that instant, the next Nakshatra transition and the exact time zone. Check whether the displayed transition is calculated geocentrically and whether the reference method has been independently reviewed.',
    'A traditional event or ceremony may specify Nakshatra among several criteria; an astronomical label by itself is not a complete Muhurat rule. Separate the physical calculation from the local tradition’s decision about eligibility.'
   ]}
  ],
  workedExample:{
   title:'Why two methods can label a boundary differently',
   setup:'Consider a hypothetical lunar position very close to a 13°20′ sector edge. Method A places the Moon just before the boundary; Method B places it just after. This is a conceptual example, not a calculated observation.',
   steps:['Both computations may agree about the date and even about most of the Moon’s path.','A small sidereal-longitude difference near a boundary can change the displayed sector label.','The reviewer must examine adopted ayanamsa, timescale and ephemeris rather than choosing the name that sounds most familiar.'],
   conclusion:'A responsible source explains boundary uncertainty before presenting an exact calendar determination.'
  },
  commonMistakes:['Treating Nakshatra as identical to a tropical zodiac sign','Assuming every source labelled Lahiri calculates identical boundary times','Declaring a traditional recommendation from one Nakshatra name alone'],
  faqs:[
   {question:'Why are there 27 Nakshatras?',answer:'The traditional division uses 27 equal sectors of the sidereal ecliptic, so each is 360° ÷ 27 = 13°20′.'},
   {question:'Can a Nakshatra change during a civil day?',answer:'Yes. The Moon advances continuously, and its sidereal longitude can cross a sector boundary at any clock time.'},
   {question:'Why do two Panchang sources disagree near a boundary?',answer:'They may use different ephemerides, sidereal corrections, reference frames or rounding conventions. Compare methodology and exact crossing instants.'}
  ],references:officialPanchangReferences
 },
 'sunrise-and-city-panchang':{
  slug:'sunrise-and-city-panchang',
  title:'Why Panchang Sunrise Times Differ by City',
  eyebrow:'LOCAL SOLAR TIME',readTime:'8 MIN READ',
  description:'See why Delhi, Mumbai and Chennai need separate sunrise calculations, what refraction changes, and why geocentric lunar transitions remain shared.',
  summary:'Sunrise depends on observing location and the adopted horizon/refraction convention. Geocentric lunar boundaries are different: they occur at the same global instant.',
  lead:'A correct city-specific Panchang is not a generic national schedule with a place name inserted. The location changes the solar day and therefore which astronomical interval is active at sunrise. But not every number should change with the city: a properly calculated geocentric lunar transition has one global UTC instant.',
  keyPoint:'Local sunrise is observer-dependent; the geocentric end of a Tithi, Nakshatra, Yoga or Karana is not simply shifted by longitude.',
  sections:[
   {title:'Latitude, longitude and local geometry',paragraphs:[
    'Longitude determines how a location is oriented relative to the Sun as Earth rotates. Latitude influences the length and seasonal geometry of the day. The observing station’s elevation and the definition of its horizon may also affect the observed sunrise.',
    'India uses Indian Standard Time, so two cities can share the same wall-clock time zone while their local sunrise occurs at noticeably different times. That is a physical difference, not a time-zone error.',
    'Publishing a daily value without naming the adopted city point can mislead readers. A reproducible calendar needs coordinates, a horizon model, the date and the astronomical method.'
   ],list:['Reference latitude and longitude','Station elevation and adopted horizon','Sunrise definition and atmospheric refraction assumption','Time zone and conversion of UTC instants to local clock time']},
   {title:'Why refraction and the Sun’s apparent edge matter',paragraphs:[
    'At a real horizon, atmospheric refraction changes the apparent position of the Sun. A standard sunrise calculation often uses the appearance of the Sun’s upper limb instead of its geometric centre. Both choices shift the stated clock time.',
    'The official Rashtriya Panchang explanation explicitly defines its adopted sunrise convention using atmospheric refraction and solar semi-diameter. Another publisher may use a different horizon model; differences should be compared against the declared conventions, not treated automatically as calculation errors.',
    'A hilltop, a sea-level site and a built-up local horizon need not produce exactly the same observed solar event. This is why claiming second-level “precision” without a documented observer site is misleading.'
   ]},
   {title:'The crucial difference: local sun versus global lunar boundary',paragraphs:[
    'For a geocentric Panchang calculation, Tithi is governed by the angular difference between the Moon and Sun, while Nakshatra and Yoga use sidereal longitude. Those computed phase boundaries refer to astronomical instants, not to the location of a user standing in Delhi or Mumbai.',
    'What does depend on the user’s city is the moment of sunrise at which a daily entry is sampled. The same phase may be active at sunrise in one place but already over by sunrise in another. That creates a legitimate city-specific daily result without inventing different global lunar transition clocks.',
    'Religious observance is a third layer. It may take a special period or local rule as its reference, rather than the basic sunrise entry. A high-quality site should describe that selection process separately from astronomical observations.'
   ]}
  ],
  workedExample:{
   title:'Two cities, one lunar transition',
   setup:'Imagine a geocentric Nakshatra transition at 06:50 IST. Sunrise occurs at 06:15 IST in City A and 07:05 IST in City B. All three clocks are fictional teaching values.',
   steps:['City A checks its sunrise before the transition and sees the earlier Nakshatra.','City B checks after the transition and sees the succeeding Nakshatra.','The transition remains at 06:50 IST in both cases; its clock time does not change just because a city was selected.'],
   conclusion:'Local daily Panchang fields can differ even when the underlying geocentric astronomical event agrees.'
  },
  commonMistakes:['Changing all lunar transition clocks just by substituting a city','Comparing local sunrise without stating refraction or horizon convention','Using a nationally adopted central-station sunrise as a verified local sunrise for every Indian city'],
  faqs:[
   {question:'Does India’s single time zone mean sunrise is the same everywhere?',answer:'No. IST is a civil clock convention; sunrise follows the local position of the Sun and depends on geography and season.'},
   {question:'Why does the government Rashtriya Panchang mention a central station?',answer:'Its methodology documents the adopted central-station reference for certain solar and calendar quantities. Those values cannot automatically be re-labelled as local observations in every city.'},
   {question:'Is a geocentric Tithi ending time different in Chennai and Mumbai?',answer:'The geocentric crossing is one global instant. The local sunrise used to assign a daily entry differs; traditions may also apply their own observance rules.'}
  ],references:officialPanchangReferences
 }
} satisfies Record<string,LearningGuide>;
export type LearningSlug=keyof typeof learningGuides;
export const learningSlugs=Object.keys(learningGuides) as LearningSlug[];
