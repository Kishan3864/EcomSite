import type { Brand, Category } from "@/lib/types";
import { POOL, img } from "./images";

/* ----------------------------- Brands ----------------------------- */

export const brands: Brand[] = [
  { id: "b1", slug: "novair", name: "Novair", logoText: "NOVAIR", tagline: "Audio engineered in Bengaluru", origin: "Bengaluru" },
  { id: "b2", slug: "kestrel", name: "Kestrel", logoText: "Kestrel", tagline: "Computing without compromise", origin: "Pune" },
  { id: "b3", slug: "orbo", name: "Orbo", logoText: "ORBO", tagline: "Smart devices for everyday life", origin: "Hyderabad" },
  { id: "b4", slug: "loomcraft", name: "Loomcraft", logoText: "Loomcraft", tagline: "Handwoven, slow-made textiles", origin: "Jaipur" },
  { id: "b5", slug: "saanjh", name: "Saanjh", logoText: "Saanjh", tagline: "Contemporary Indian womenswear", origin: "New Delhi" },
  { id: "b6", slug: "indus-forge", name: "Indus Forge", logoText: "INDUS FORGE", tagline: "Leather goods, built to age well", origin: "Kanpur" },
  { id: "b7", slug: "terra-nine", name: "Terra Nine", logoText: "TERRA 9", tagline: "Performance footwear for Indian roads", origin: "Chennai" },
  { id: "b8", slug: "copperleaf", name: "Copperleaf", logoText: "Copperleaf", tagline: "Kitchenware with a memory", origin: "Ahmedabad" },
  { id: "b9", slug: "bloom-barn", name: "Bloom & Barn", logoText: "Bloom & Barn", tagline: "Furniture for small Indian homes", origin: "Bengaluru" },
  { id: "b10", slug: "nirvaan", name: "Nirvaan Naturals", logoText: "NIRVAAN", tagline: "Ayurveda, reformulated", origin: "Kochi" },
  { id: "b11", slug: "sundara", name: "Sundara", logoText: "SUNDARA", tagline: "Fine jewellery for every day", origin: "Jaipur" },
  { id: "b12", slug: "peak-pine", name: "Peak & Pine", logoText: "PEAK & PINE", tagline: "Outdoor and training gear", origin: "Manali" },
  { id: "b13", slug: "studio-vayu", name: "Studio Vayu", logoText: "studio vayu", tagline: "Objects for considered spaces", origin: "Goa" },
  { id: "b14", slug: "halcyon", name: "Halcyon Press", logoText: "Halcyon", tagline: "Books and paper goods", origin: "Kolkata" },
  { id: "b15", slug: "mistral", name: "Mistral", logoText: "MISTRAL", tagline: "Optics and imaging", origin: "Mumbai" },
  { id: "b16", slug: "kavya", name: "Kavya Living", logoText: "Kavya", tagline: "Soft furnishing studio", origin: "Jodhpur" },
];

export const brandMap = new Map(brands.map((b) => [b.slug, b]));

/* --------------------------- Categories --------------------------- */

type SubSeed = [slug: string, name: string, pool: keyof typeof POOL, idx: number, desc: string];

function buildSubs(categorySlug: string, seeds: SubSeed[]) {
  return seeds.map(([slug, name, pool, idx, description], i) => ({
    id: `${categorySlug}-sub-${i + 1}`,
    slug,
    name,
    categorySlug,
    description,
    image: {
      url: img(POOL[pool][idx % POOL[pool].length], { fit: "square", w: 600 }),
      alt: name,
    },
  }));
}

export const categories: Category[] = [
  {
    id: "c1",
    slug: "electronics",
    name: "Electronics",
    menuLabel: "Tech & Gadgets",
    icon: "cpu",
    accent: "#2c837c",
    description:
      "Phones, laptops, audio and wearables from brands building for Indian conditions — with real warranty support and doorstep service.",
    image: { url: img(POOL.phones[1], { fit: "square", w: 600 }), alt: "Electronics" },
    featuredBrands: ["novair", "kestrel", "orbo", "mistral"],
    highlights: ["Brand warranty on every unit", "7-day replacement", "No-cost EMI from ₹4,999"],
    subcategories: buildSubs("electronics", [
      ["smartphones", "Smartphones", "phones", 0, "Flagship and mid-range phones with India-first warranty."],
      ["laptops", "Laptops", "laptops", 0, "Thin-and-light to creator-grade machines."],
      ["audio", "Headphones & Audio", "audio", 0, "ANC headphones, earbuds and desk speakers."],
      ["wearables", "Smartwatches", "wearables", 0, "Fitness, health and everyday smartwatches."],
      ["cameras", "Cameras", "cameras", 0, "Mirrorless bodies, lenses and vlogging kits."],
    ]),
  },
  {
    id: "c2",
    slug: "fashion",
    name: "Fashion",
    menuLabel: "Wardrobe",
    icon: "shirt",
    accent: "#e0316a",
    description:
      "Handloom, everyday essentials and occasion wear from Indian design studios. Free size exchange within 14 days.",
    image: { url: img(POOL.womenwear[0], { fit: "square", w: 600 }), alt: "Fashion" },
    featuredBrands: ["saanjh", "loomcraft", "terra-nine", "indus-forge"],
    highlights: ["Free size exchange", "Handloom-first sourcing", "True-to-size fit guide"],
    subcategories: buildSubs("fashion", [
      ["women", "Womenswear", "womenwear", 1, "Kurtas, dresses, co-ords and occasion wear."],
      ["men", "Menswear", "menwear", 0, "Shirts, tees, trousers and layering."],
      ["footwear", "Footwear", "footwear", 0, "Sneakers, loafers, sandals and running shoes."],
      ["bags", "Bags & Luggage", "bags", 0, "Leather totes, backpacks and weekenders."],
      ["watches", "Watches", "wearables", 3, "Automatic, quartz and dress watches."],
    ]),
  },
  {
    id: "c3",
    slug: "home-living",
    name: "Home & Living",
    menuLabel: "For the Home",
    icon: "sofa",
    accent: "#d2740c",
    description:
      "Furniture, lighting and decor scaled for Indian apartments. Assembly included in 40+ cities.",
    image: { url: img(POOL.furniture[0], { fit: "square", w: 600 }), alt: "Home and living" },
    featuredBrands: ["bloom-barn", "studio-vayu", "kavya", "loomcraft"],
    highlights: ["Free assembly in 40+ cities", "3-year frame warranty", "Made-to-order options"],
    subcategories: buildSubs("home-living", [
      ["furniture", "Furniture", "furniture", 0, "Sofas, beds, storage and study desks."],
      ["decor", "Decor & Lighting", "decor", 0, "Lamps, vases, mirrors and wall art."],
      ["bedding", "Bedding & Bath", "decor", 3, "Cotton bedsheets, quilts and towels."],
      ["rugs", "Rugs & Furnishing", "furniture", 5, "Handknotted rugs, runners and cushions."],
    ]),
  },
  {
    id: "c4",
    slug: "kitchen",
    name: "Kitchen",
    menuLabel: "Kitchen & Dining",
    icon: "chef-hat",
    accent: "#1f6963",
    description:
      "Cookware, appliances and dining that survive daily Indian cooking — high heat, heavy use, real families.",
    image: { url: img(POOL.kitchen[0], { fit: "square", w: 600 }), alt: "Kitchen" },
    featuredBrands: ["copperleaf", "studio-vayu", "orbo"],
    highlights: ["Induction & gas compatible", "Lifetime cookware warranty", "Dishwasher safe"],
    subcategories: buildSubs("kitchen", [
      ["cookware", "Cookware", "kitchen", 0, "Triply, cast iron and non-stick."],
      ["appliances", "Small Appliances", "kitchen", 2, "Mixers, air fryers and coffee gear."],
      ["dining", "Dining & Serveware", "kitchen", 4, "Dinner sets, glassware and platters."],
      ["storage", "Kitchen Storage", "kitchen", 5, "Airtight jars, racks and organisers."],
    ]),
  },
  {
    id: "c5",
    slug: "beauty",
    name: "Beauty & Wellness",
    menuLabel: "Beauty",
    icon: "sparkles",
    accent: "#c81a54",
    description:
      "Dermat-tested skincare, haircare and fragrance formulated for Indian skin tones and climate.",
    image: { url: img(POOL.beauty[0], { fit: "square", w: 600 }), alt: "Beauty" },
    featuredBrands: ["nirvaan", "sundara", "studio-vayu"],
    highlights: ["Dermatologically tested", "Cruelty-free", "Fresh batch guarantee"],
    subcategories: buildSubs("beauty", [
      ["skincare", "Skincare", "beauty", 0, "Serums, sunscreens and moisturisers."],
      ["haircare", "Haircare", "beauty", 2, "Oils, shampoos and scalp treatments."],
      ["fragrance", "Fragrance", "beauty", 4, "Eau de parfum and attars."],
      ["wellness", "Wellness", "beauty", 6, "Supplements, teas and self-care."],
    ]),
  },
  {
    id: "c6",
    slug: "jewellery",
    name: "Jewellery",
    menuLabel: "Jewellery",
    icon: "gem",
    accent: "#a5530d",
    description:
      "925 silver, 18k gold-plated and demi-fine jewellery — hallmarked, insured shipping, 30-day returns.",
    image: { url: img(POOL.jewellery[0], { fit: "square", w: 600 }), alt: "Jewellery" },
    featuredBrands: ["sundara", "studio-vayu"],
    highlights: ["Hallmarked & certified", "Insured shipping", "Lifetime replating"],
    subcategories: buildSubs("jewellery", [
      ["earrings", "Earrings", "jewellery", 0, "Studs, hoops and jhumkas."],
      ["necklaces", "Necklaces", "jewellery", 1, "Chains, pendants and layered sets."],
      ["rings", "Rings", "jewellery", 2, "Stacking bands and statement rings."],
      ["bracelets", "Bracelets", "jewellery", 4, "Cuffs, kadas and tennis bracelets."],
    ]),
  },
  {
    id: "c7",
    slug: "sports",
    name: "Sports & Fitness",
    menuLabel: "Sport",
    icon: "dumbbell",
    accent: "#164441",
    description:
      "Training equipment, recovery and outdoor gear tested by Indian athletes and weekend runners.",
    image: { url: img(POOL.fitness[0], { fit: "square", w: 600 }), alt: "Sports and fitness" },
    featuredBrands: ["peak-pine", "terra-nine", "orbo"],
    highlights: ["Athlete-tested", "2-year equipment warranty", "Free training plans"],
    subcategories: buildSubs("sports", [
      ["training", "Training & Gym", "fitness", 0, "Dumbbells, mats, bands and benches."],
      ["outdoor", "Outdoor & Trek", "fitness", 2, "Packs, tents and trail gear."],
      ["activewear", "Activewear", "fitness", 4, "Performance tees, shorts and tights."],
      ["recovery", "Recovery", "fitness", 5, "Foam rollers, massage guns and braces."],
    ]),
  },
  {
    id: "c8",
    slug: "books",
    name: "Books & Stationery",
    menuLabel: "Books & Paper",
    icon: "book-open",
    accent: "#585851",
    description:
      "Fiction, non-fiction and beautifully made paper goods — curated by readers, not algorithms.",
    image: { url: img(POOL.books[0], { fit: "square", w: 600 }), alt: "Books" },
    featuredBrands: ["halcyon", "studio-vayu"],
    highlights: ["Curated by readers", "Gift wrap available", "Free shipping over ₹499"],
    subcategories: buildSubs("books", [
      ["fiction", "Fiction", "books", 0, "Literary, translated and contemporary fiction."],
      ["non-fiction", "Non-fiction", "books", 1, "History, business and biography."],
      ["stationery", "Stationery", "books", 3, "Notebooks, pens and desk goods."],
      ["art", "Art & Craft", "books", 4, "Sketchbooks, paints and supplies."],
    ]),
  },
];

export const categoryMap = new Map(categories.map((c) => [c.slug, c]));

export const subcategoryMap = new Map(
  categories.flatMap((c) =>
    c.subcategories.map((s) => [`${c.slug}/${s.slug}`, s] as const),
  ),
);
