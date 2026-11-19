import { ALL_REQUEST_CATEGORIES, CATEGORY_VISUALS } from "./categoryVisuals";

/**
 * Editorial layer over the nine request categories.
 *
 * `categoryVisuals.ts` owns what a category *looks* like; this owns what it
 * *means* — what is genuinely useful to donate, what a donee will end up having
 * to throw away, and how to prepare an item before handing it over.
 *
 * `name` is the canonical category string and the only value that may ever
 * reach the API. `slug` exists purely for URLs and is derived from the name,
 * never the other way round — see `categoryBySlug`.
 */
export type InKindCategory = {
  /** English search title (the root template appends " | CauseKind"). */
  seoTitle: string;
  /** English meta description, 140-160 characters. */
  seoDescription: string;
  /** Canonical name — must appear verbatim in ALL_REQUEST_CATEGORIES. */
  name: string;
  /** URL segment only. Never sent to the backend. */
  slug: string;
  tagline: string;
  /** Server-rendered intro under "Donation Guidelines" on the category page. */
  guideIntro: string;
  intro: string;
  goodToDonate: string[];
  avoid: string[];
  preparation: string[];
  quote: { text: string; attribution: string };
};

export const IN_KIND_CATEGORIES: InKindCategory[] = [
  {
    name: "Medical aid",
    slug: "medical-aid",
    seoTitle: "Donate Medical Aid Near You",
    seoDescription: "Donate wheelchairs, walkers, BP monitors and in-date medical consumables directly to verified people and NGOs near you. See current requests on CauseKind.",
    tagline: "Mobility, comfort and health-related support.",
    guideIntro:
      "Donate Medical Aid Near You: medical aid covers mobility, comfort and health-related support. People here ask for things like wheelchairs, walkers and crutches, hospital beds and pressure-relief mattresses, and everyday devices such as nebulisers, blood pressure monitors and glucometers. Hearing aids, spectacles and mobility ramps are also useful. Consumables such as adult diapers or dressings help most when they are unopened and still in date. Before you give, check that the device has all its parts and still works properly. Please do not offer prescription medicines of any kind, opened or expired consumables, or devices with cracked frames, seized wheels or missing safety straps. Anything that needs a prescription fitting, such as used orthotics, also should not be offered.",
    intro:
      "Medical needs are the most time-sensitive on CauseKind. A wheelchair that arrives three weeks late is a person who stayed indoors for three weeks. These are also the items where condition matters most — a mobility aid that fails under load is worse than none at all.",
    goodToDonate: [
      "Wheelchairs, walkers and crutches with all parts present",
      "Hospital beds and pressure-relief mattresses",
      "Nebulisers, BP monitors and glucometers that still calibrate",
      "Hearing aids, spectacles and mobility ramps",
      "Unopened, in-date consumables such as adult diapers or dressings",
    ],
    avoid: [
      "Prescription medicines of any kind — we cannot legally pass these on",
      "Opened or expired consumables",
      "Devices with cracked frames, seized wheels or missing safety straps",
      "Anything needing a prescription fitting, such as used orthotics",
    ],
    preparation: [
      "Wipe down every surface that touches skin",
      "Test the folding mechanism, brakes and wheels under real weight",
      "Include the charger, manual and any spare parts you still have",
      "Photograph the item from three angles, including any damage",
      "Say plainly in the description what does not work",
    ],
    quote: {
      text: "A wheelchair sitting unused in a spare room is not storage. It is someone's independence, waiting.",
      attribution: "CauseKind",
    },
  },
  {
    name: "Education",
    slug: "education",
    seoTitle: "Donate Books & Stationery",
    seoDescription: "Donate books, textbooks, stationery and school bags directly to verified students, families and NGOs near you. See current requests on CauseKind.",
    tagline: "Books, stationery and the tools of a school day.",
    guideIntro:
      "Donate Books & Stationery: education requests are for books, stationery and the tools of a school day. Students ask for textbooks and guides for their current syllabus, unused notebooks, pens, geometry boxes and art supplies, and school bags with working zips and intact straps. Uniforms in common sizes help when they are cleaned and pressed, and calculators, drawing boards and lab equipment are often needed too. Story books and reference books are welcome in any local language. To make sure your donation is used, avoid textbooks from an older syllabus or a different board, books with heavy highlighting, missing pages or filled-in exercises, half-used notebooks and dried-out pens, and uniforms with a school crest that will not match the student's school.",
    intro:
      "Education requests cluster around the start of a term and around exams. A school bag in June is worth more than the same bag in October. Match the syllabus and the year where you can — the right textbook for the wrong board helps nobody.",
    goodToDonate: [
      "Textbooks and guides for the current syllabus",
      "Unused notebooks, pens, geometry boxes and art supplies",
      "School bags with working zips and intact straps",
      "Uniforms in common sizes, cleaned and pressed",
      "Calculators, drawing boards and lab equipment",
      "Story books and reference books in any local language",
    ],
    avoid: [
      "Textbooks from a superseded syllabus or a different board",
      "Books with heavy highlighting, missing pages or filled-in exercises",
      "Half-used notebooks and dried-out pens",
      "Uniforms with a school crest that will not match",
    ],
    preparation: [
      "Note the board, subject and year on every textbook",
      "Erase pencil marks; leave ink annotations described honestly",
      "Bundle sets together so they arrive complete",
      "Check nothing personal is written inside the covers",
    ],
    quote: {
      text: "The book you finished with is the book someone else is waiting to start.",
      attribution: "CauseKind",
    },
  },
  {
    name: "Livelihood",
    slug: "livelihood",
    seoTitle: "Donate Livelihood Tools Near You",
    seoDescription: "Donate sewing machines, tools and work equipment that help people earn a living. Give directly to verified people and NGOs near you on CauseKind.",
    tagline: "Tools that let someone earn rather than receive.",
    guideIntro:
      "Donate Livelihood Tools Near You: livelihood requests are for tools that let someone earn rather than receive. People ask for sewing machines, overlockers and tailoring equipment, hand tools and power tools for carpentry, masonry or repair, and commercial-grade kitchen equipment for food vendors. Small traders often need carts, crates and weighing scales, and working laptops help with freelance or data-entry work. Salon, embroidery and craft equipment is useful as well. A tool only helps if it is complete, so please avoid items missing the bit, blade, foot or attachment that makes them usable, machines that need a part no longer made, and power tools with damaged cords or missing guards. Hobby-grade equipment is not suitable when the request is clearly for daily commercial use.",
    intro:
      "Livelihood is the category with the longest tail. A sewing machine is not a one-time gift — it is income every month for years. These requests are usually specific, because the person asking already knows the trade and knows exactly which tool is missing.",
    goodToDonate: [
      "Sewing machines, overlockers and tailoring equipment",
      "Hand tools and power tools for carpentry, masonry or repair",
      "Commercial-grade kitchen equipment for food vendors",
      "Carts, crates and weighing scales for small traders",
      "Working laptops for freelance or data-entry work",
      "Salon, embroidery and craft equipment",
    ],
    avoid: [
      "Tools missing the bit, blade, foot or attachment that makes them usable",
      "Machines needing a part no longer manufactured",
      "Power tools with damaged cords or missing guards",
      "Hobby-grade equipment where the request clearly implies daily commercial use",
    ],
    preparation: [
      "Run the machine once and describe exactly how it performed",
      "Include bobbins, blades, belts, feet and every attachment you have",
      "Pass on the manual, or the model number so one can be found",
      "Service it if it is close — a small repair on your side saves weeks on theirs",
    ],
    quote: {
      text: "Give someone an item and you have helped once. Give someone their trade back and you never need to give again.",
      attribution: "CauseKind",
    },
  },
  {
    name: "Relief",
    slug: "relief",
    seoTitle: "Donate Relief Supplies Near You",
    seoDescription: "Donate blankets, tarpaulins, mosquito nets, solar lamps and sealed hygiene items directly to verified people and NGOs near you. See requests on CauseKind.",
    tagline: "Essentials for families in the middle of an emergency.",
    guideIntro:
      "Donate Relief Supplies Near You: relief requests are for essentials that families need in the middle of an emergency. The most useful items are blankets, bedsheets, towels and mats, tarpaulins, mosquito nets and basic shelter material, and cooking vessels, stoves and water containers. Torches, batteries, power banks and solar lamps help when power is out, and sealed hygiene items such as soap, sanitary pads and toothbrushes are always needed. Sturdy footwear and weather-appropriate outerwear also make a real difference. Please do not send perishable or home-cooked food, anything damp, mildewed or stored in a flooded space, or single fragile items that will not survive transport. Used personal hygiene products of any kind should not be offered.",
    intro:
      "Relief requests come from households that have lost most of what they owned — to a flood, a fire, an eviction, a sudden illness. Speed and basic dignity beat quality here. A clean blanket today is worth more than an excellent one next month.",
    goodToDonate: [
      "Blankets, bedsheets, towels and mats",
      "Tarpaulins, mosquito nets and basic shelter material",
      "Cooking vessels, stoves and water containers",
      "Torches, batteries, power banks and solar lamps",
      "Sealed hygiene items — soap, sanitary pads, toothbrushes",
      "Sturdy footwear and weather-appropriate outerwear",
    ],
    avoid: [
      "Perishable or home-cooked food",
      "Anything damp, mildewed or stored in a flooded space",
      "Single fragile items that will not survive transport",
      "Used personal hygiene products of any kind",
    ],
    preparation: [
      "Wash and fully dry textiles — damp bedding grows mould in transit",
      "Pack in one sealed, waterproof bundle rather than loose pieces",
      "Label what is inside so nothing has to be unpacked to be sorted",
      "Respond quickly — relief requests go stale faster than any other kind",
    ],
    quote: {
      text: "In an emergency nobody is waiting for the perfect thing. They are waiting for something dry.",
      attribution: "CauseKind",
    },
  },
  {
    name: "Household",
    slug: "household",
    seoTitle: "Donate Household Items Near You",
    seoDescription: "Donate kitchen utensils, appliances and everyday household items directly to verified families and NGOs near you. See current requests on CauseKind.",
    tagline: "The daily-use items that make a room a home.",
    guideIntro:
      "Donate Household Items Near You: household requests are for the daily-use items that make a room a home. Families ask for cookware, pressure cookers, utensils and cutlery, bedding, pillows, curtains and floor mats, and storage containers, shelves and organisers. Small appliances such as fans, irons and mixers are welcome when they are in working order, and buckets, mops and basic cleaning equipment are often needed. Check items before you list them: avoid chipped or cracked crockery, non-stick pans with a flaking coating, pillows and mattresses with stains or a lasting smell, and appliances that trip a socket or run hot. If a set is incomplete, say clearly what is missing so the receiver knows what they are getting.",
    intro:
      "Household requests often follow a move, a marriage or a first independent home. They are rarely dramatic and almost always practical: something to cook in, something to sleep on, something to store things in.",
    goodToDonate: [
      "Cookware, pressure cookers, utensils and cutlery",
      "Bedding, pillows, curtains and floor mats",
      "Storage containers, shelves and organisers",
      "Fans, irons, mixers and other small appliances in working order",
      "Buckets, mops and basic cleaning equipment",
    ],
    avoid: [
      "Chipped or cracked crockery and non-stick pans with flaking coating",
      "Pillows and mattresses with stains or a persistent smell",
      "Appliances that trip a socket or run hot",
      "Incomplete sets sent without saying what is missing",
    ],
    preparation: [
      "Wash and dry everything that touches food",
      "Plug in each appliance and confirm it runs for a few minutes",
      "Count the set and state the count in the listing",
      "Wrap anything breakable properly before handover",
    ],
    quote: {
      text: "A house becomes a home at the point where there is something to cook in and something to sleep on.",
      attribution: "CauseKind",
    },
  },
  {
    name: "Furniture",
    slug: "furniture",
    seoTitle: "Donate Furniture Near You",
    seoDescription: "Donate beds, tables, chairs, cupboards and other usable furniture directly to verified families and NGOs near you. See current requests on CauseKind.",
    tagline: "Beds, chairs, tables and storage that still have decades left.",
    guideIntro:
      "Donate Furniture Near You: furniture requests are for beds, chairs, tables and storage that still have years of use left. People ask for beds, cots and mattresses that are clean and structurally sound, chairs, tables and desks with all legs true, and wardrobes, cupboards and shelving units. Sofas are welcome when the frame is intact and the upholstery is unstained, and flat-pack items are useful if you still have the fittings. Please avoid anything with woodworm, termite damage or signs of pests, water-damaged particleboard that will not survive another move, mattresses with stains, tears or a bed-bug history, and glass tops with chips or edge cracks. Be clear about size and weight so the receiver can plan how to collect it.",
    intro:
      "Furniture is the category where transport decides everything. A donee with no vehicle cannot accept a wardrobe, however good it is. Be honest about size and weight up front — a listing that says 'two people can lift this' gets matched far faster than one that does not.",
    goodToDonate: [
      "Beds, cots and mattresses that are clean and structurally sound",
      "Chairs, tables and desks with all legs true",
      "Wardrobes, cupboards and shelving units",
      "Sofas with intact frames and unstained upholstery",
      "Flat-pack items you still have the fittings for",
    ],
    avoid: [
      "Anything with woodworm, termite damage or active pest signs",
      "Water-damaged particleboard — it will not survive a second move",
      "Mattresses with stains, tears or bed-bug history",
      "Glass tops with chips or edge cracks",
    ],
    preparation: [
      "Measure it and put the real dimensions and weight in the listing",
      "Dismantle flat-pack items and bag the screws to the frame",
      "Vacuum upholstery and check the seams and underside",
      "Say clearly whether you can help load it",
    ],
    quote: {
      text: "Most furniture outlives the room it was bought for. The question is only whether it finds the next room.",
      attribution: "CauseKind",
    },
  },
  {
    name: "Clothing",
    slug: "clothing",
    seoTitle: "Donate Clothes Near You",
    seoDescription: "Donate clean, wearable clothes for children, women and men directly to verified people and NGOs near you. See current clothing requests on CauseKind.",
    tagline: "Clean, wearable clothes for every age and season.",
    guideIntro:
      "Donate Clothes Near You: clothing requests are for clean, wearable clothes for every age and season. Everyday wear in good repair, washed and folded, is always useful, and children's and infant clothing is needed often. Season-appropriate outerwear such as sweaters, jackets and shawls helps in colder months, and footwear with life left in the sole should be paired and tied together. Uniforms, workwear and modest-wear in common sizes are also requested. Please avoid torn, stained, faded or stretched-out garments, underwear and swimwear unless they are brand new and sealed, odd shoes or shoes with worn-through soles, and heavily seasonal items sent long before or after their season.",
    intro:
      "Clothing is the most donated category and the one most often misused as a way to empty a wardrobe. The test is simple and worth applying honestly: would you be comfortable wearing this in public tomorrow? If not, it belongs in textile recycling, not on CauseKind.",
    goodToDonate: [
      "Everyday wear in good repair, washed and folded",
      "Children's and infant clothing, which moves fastest of all",
      "Season-appropriate outerwear — sweaters, jackets, shawls",
      "Footwear with life left in the sole, paired and tied together",
      "Uniforms, workwear and modest-wear in common sizes",
    ],
    avoid: [
      "Torn, stained, faded or stretched-out garments",
      "Underwear and swimwear, unless brand new and sealed",
      "Odd shoes, or shoes with worn-through soles",
      "Heavily seasonal items sent months out of season",
    ],
    preparation: [
      "Wash and fully dry everything before listing",
      "Sort by size and age group, and say the sizes in the listing",
      "Check every pocket",
      "Pack folded in a sealed bag so nothing arrives creased or damp",
    ],
    quote: {
      text: "If you would not wear it out tomorrow, it is not a donation. It is a delegation of the disposal.",
      attribution: "CauseKind",
    },
  },
  {
    name: "Electronics",
    slug: "electronics",
    seoTitle: "Donate Laptops & Electronics",
    seoDescription: "Donate working laptops, phones and tablets to verified students and NGOs near you. See current requests and how to wipe your data first on CauseKind.",
    tagline: "Working phones, laptops and appliances with real life left.",
    guideIntro:
      "Donate Laptops & Electronics: electronics requests are for working phones, laptops and appliances with real life left in them. Students and families ask for phones and tablets that hold a charge and are fully factory reset, laptops in working order with their charger, and televisions, monitors and speakers that power on cleanly. Kitchen appliances such as mixers, kettles and induction plates are useful too, along with cables, chargers and adapters that are clearly labelled. Before you give, sign out of your accounts: a device still locked to you cannot be used. Avoid swollen, leaking or badly worn batteries, cracked screens, frayed cables or damaged charging ports, and say so if a device has not been powered on for a long time.",
    intro:
      "Electronics carry two risks nothing else does: your data, and a device that dies a week after handover. Both are solvable in ten minutes on your side and unsolvable on theirs. Wipe it, test it, and include the charger.",
    goodToDonate: [
      "Phones and tablets that hold a charge and are fully factory reset",
      "Laptops in working order, with the charger",
      "Televisions, monitors and speakers that power on cleanly",
      "Kitchen appliances — mixers, kettles, induction plates",
      "Cables, chargers and adapters, clearly labelled",
    ],
    avoid: [
      "Devices still locked to your account — an iCloud-locked phone is scrap",
      "Swollen, leaking or badly degraded batteries",
      "Cracked screens, frayed cables or damaged charging ports",
      "Anything you have not powered on in over a year without saying so",
    ],
    preparation: [
      "Back up, sign out of every account, then factory reset",
      "Remove SIM and memory cards and check twice",
      "Power it on and note the real battery health and any faults",
      "Include the charger and cable — a laptop without one is half a laptop",
    ],
    quote: {
      text: "Sign out before you hand over. A device still carrying your account is a burden, not a gift.",
      attribution: "CauseKind",
    },
  },
  {
    name: "Sports",
    slug: "sports",
    seoTitle: "Donate Sports Equipment Near You",
    seoDescription: "Donate bats, balls, bicycles, sports shoes and indoor games in playable condition directly to verified people and NGOs near you. See requests on CauseKind.",
    tagline: "Gear, cycles and fitness equipment for kids and adults.",
    guideIntro:
      "Donate Sports Equipment Near You: sports requests are for gear, cycles and fitness equipment for children and adults. People ask for bats, balls, racquets and team equipment in playable condition, bicycles with sound brakes, true wheels and inflated tyres, and fitness equipment such as dumbbells, mats and resistance bands. Sports shoes and kit that have been outgrown rather than worn out are welcome, as are carrom boards, chess sets and other indoor games. Safety comes first: please avoid helmets and protective gear that have taken an impact, cracked bats, delaminated racquets or perished rubber, and cycles that need repairs worth more than the cycle. Do not give anything where a failure during use could cause an injury.",
    intro:
      "Sports requests come from schools, coaching groups and individual young players who have the ability and not the kit. Sizing and safety carry the weight here — outgrown gear that still fits someone smaller is exactly right, worn-out protective gear never is.",
    goodToDonate: [
      "Bats, balls, racquets and team equipment in playable condition",
      "Bicycles with sound brakes, true wheels and inflated tyres",
      "Fitness equipment — dumbbells, mats, resistance bands",
      "Sports shoes and kit that have been outgrown rather than worn out",
      "Carrom boards, chess sets and indoor game equipment",
    ],
    avoid: [
      "Helmets and protective gear that have taken an impact — these do not work twice",
      "Cracked bats, delaminated racquets or perished rubber",
      "Cycles needing repairs worth more than the cycle",
      "Anything where a failure mid-use would cause injury",
    ],
    preparation: [
      "Inflate the tyres and test the brakes before you list a cycle",
      "Clean the kit and state the size clearly",
      "Check protective gear for hairline cracks and be strict about it",
      "Include pumps, covers, grips and any spare parts",
    ],
    quote: {
      text: "Talent is distributed evenly. Equipment is not. That gap is the only one we are trying to close here.",
      attribution: "CauseKind",
    },
  },
];

// Fail at import rather than rendering a blank page: every editorial entry must
// map onto a real request category and a real visual, and slugs must be unique.
// If someone adds a tenth category to ALL_REQUEST_CATEGORIES, this is what tells
// them the discovery pages need an entry too.
{
  const seen = new Set<string>();
  for (const c of IN_KIND_CATEGORIES) {
    if (!ALL_REQUEST_CATEGORIES.includes(c.name)) {
      throw new Error(`inKindCategories: "${c.name}" is not in ALL_REQUEST_CATEGORIES`);
    }
    if (!CATEGORY_VISUALS[c.name]) {
      throw new Error(`inKindCategories: "${c.name}" has no CATEGORY_VISUALS entry`);
    }
    if (seen.has(c.slug)) {
      throw new Error(`inKindCategories: duplicate slug "${c.slug}"`);
    }
    seen.add(c.slug);
  }
  const missing = ALL_REQUEST_CATEGORIES.filter(
    (n) => !IN_KIND_CATEGORIES.some((c) => c.name === n)
  );
  if (missing.length > 0) {
    throw new Error(`inKindCategories: no editorial entry for ${missing.join(", ")}`);
  }
}

/**
 * The single slug → canonical name resolver. A URL slug must never reach the
 * API; callers take `.name` from the result and pass that instead.
 */
export function categoryBySlug(slug: string): InKindCategory | undefined {
  return IN_KIND_CATEGORIES.find((c) => c.slug === slug);
}

/**
 * The inverse: canonical name → URL slug. Kept here beside `categoryBySlug` so
 * the name↔slug mapping has exactly one home — a caller deriving its own with
 * `toLowerCase().replace(/ /g, "-")` would happen to be right today and would
 * break silently the first time a category name stops being slug-shaped.
 *
 * Returns `undefined` for a name with no editorial entry. The load-time
 * validation above means that cannot happen for a real request category, so a
 * caller may treat `undefined` as "do not link" rather than an error.
 */
export function slugForCategory(name: string): string | undefined {
  return IN_KIND_CATEGORIES.find((c) => c.name === name)?.slug;
}

export const IN_KIND_SLUGS = IN_KIND_CATEGORIES.map((c) => c.slug);
