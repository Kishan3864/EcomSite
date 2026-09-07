import type {
  Product,
  ProductBadge,
  RatingBreakdown,
  Specification,
  VariantGroup,
} from "@/lib/types";
import { type PoolKey, img, pickImages } from "./images";
import { brandMap } from "./taxonomy";
import { seeded, slugify } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 * Seed table. One row per product — the shape a product-import CSV or
 * a `/api/products` payload would realistically have. Everything else
 * (specs, breakdowns, cross-sells) is derived below.
 * ------------------------------------------------------------------ */

type VariantKind = "size" | "storage" | "shoe" | "ml" | "ring" | "none";

interface Seed {
  t: string;
  st: string;
  b: string;
  c: string;
  s: string;
  p: number;
  m: number;
  r: number;
  rc: number;
  stk: number;
  pool: PoolKey;
  io: number;
  bd?: ProductBadge[];
  tg?: string[];
  cl?: string[];
  v?: VariantKind;
  dd?: number;
  w?: string;
  sp?: [string, string][];
}

export const COLOR_HEX: Record<string, string> = {
  "Ink Black": "#1a1a18",
  "Peacock": "#2c837c",
  "Marigold": "#ee9014",
  "Ivory": "#f2ede4",
  "Terracotta": "#b4553a",
  "Sand": "#d8c3a5",
  "Rose": "#e0316a",
  "Indigo": "#2f3b7a",
  "Olive": "#6b7350",
  "Steel": "#8a9099",
  "Copper": "#b06c3a",
  "Pearl": "#f7f7f5",
  "Midnight": "#16233f",
  "Sage": "#9fb08e",
  "Blush": "#f0cdc7",
  "Wine": "#6d1f36",
  "Charcoal": "#3a3a38",
  "Gold": "#c9a227",
  "Silver": "#c0c3c7",
  "Rust": "#a44a2a",
  "Cream": "#efe6d5",
  "Forest": "#22432f",
};

const SEEDS: Seed[] = [
  // ---------------------------- Smartphones ----------------------------
  { t: "Orbo Zenith 5 Pro", st: "6.7\" LTPO AMOLED · 200MP triple camera", b: "orbo", c: "electronics", s: "smartphones", p: 62999, m: 74999, r: 4.6, rc: 8421, stk: 24, pool: "phones", io: 0, bd: ["bestseller", "trending"], tg: ["5g", "flagship", "fast-charging"], cl: ["Ink Black", "Peacock", "Ivory"], v: "storage", dd: 1, w: "1 year brand warranty + 6 months on accessories" },
  { t: "Orbo Zenith 5", st: "6.4\" AMOLED · 50MP OIS camera", b: "orbo", c: "electronics", s: "smartphones", p: 47999, m: 56999, r: 4.5, rc: 5210, stk: 41, pool: "phones", io: 3, bd: ["bestseller"], tg: ["5g", "flagship"], cl: ["Ink Black", "Midnight"], v: "storage", dd: 1 },
  { t: "Orbo Nova 3", st: "120Hz display · 5000mAh · 45W charge", b: "orbo", c: "electronics", s: "smartphones", p: 24999, m: 29999, r: 4.4, rc: 12980, stk: 120, pool: "phones", io: 6, bd: ["bestseller"], tg: ["5g", "value", "big-battery"], cl: ["Peacock", "Charcoal", "Sand"], v: "storage", dd: 2 },
  { t: "Orbo Nova 3 Lite", st: "Everyday 5G with a 3-day battery", b: "orbo", c: "electronics", s: "smartphones", p: 12499, m: 15999, r: 4.2, rc: 9310, stk: 210, pool: "phones", io: 9, tg: ["5g", "budget"], cl: ["Charcoal", "Sage"], v: "storage", dd: 2 },
  { t: "Kestrel Halo X", st: "Titanium frame · 100x periscope zoom", b: "kestrel", c: "electronics", s: "smartphones", p: 44999, m: 54999, r: 4.5, rc: 3110, stk: 18, pool: "phones", io: 2, bd: ["new"], tg: ["5g", "camera", "flagship"], cl: ["Steel", "Ink Black"], v: "storage", dd: 2 },
  { t: "Kestrel Halo Fold", st: "8\" inner display · book-style fold", b: "kestrel", c: "electronics", s: "smartphones", p: 129999, m: 149999, r: 4.3, rc: 742, stk: 6, pool: "phones", io: 5, bd: ["exclusive", "limited"], tg: ["5g", "foldable", "premium"], cl: ["Ink Black", "Peacock"], v: "storage", dd: 3 },
  { t: "Mistral Vue 2", st: "Imaging-first phone with a 1\" sensor", b: "mistral", c: "electronics", s: "smartphones", p: 34999, m: 41999, r: 4.4, rc: 1890, stk: 33, pool: "phones", io: 8, bd: ["new"], tg: ["5g", "camera"], cl: ["Midnight", "Cream"], v: "storage", dd: 2 },
  { t: "Novair Pulse Lite 5G", st: "Clean software, four years of updates", b: "novair", c: "electronics", s: "smartphones", p: 15999, m: 19999, r: 4.3, rc: 6120, stk: 88, pool: "phones", io: 1, tg: ["5g", "budget", "clean-os"], cl: ["Peacock", "Ink Black"], v: "storage", dd: 2 },

  // ------------------------------ Laptops ------------------------------
  { t: "Kestrel Aero 14", st: "1.19kg magnesium chassis · 16h battery", b: "kestrel", c: "electronics", s: "laptops", p: 89999, m: 104999, r: 4.7, rc: 2140, stk: 15, pool: "laptops", io: 0, bd: ["bestseller", "handpicked"], tg: ["ultrabook", "thin-light"], cl: ["Steel", "Ink Black"], v: "storage", dd: 2, w: "2 year onsite warranty" },
  { t: "Kestrel Aero 14 Ultra", st: "OLED 3K · 32GB unified memory", b: "kestrel", c: "electronics", s: "laptops", p: 134999, m: 154999, r: 4.7, rc: 860, stk: 9, pool: "laptops", io: 3, bd: ["new", "exclusive"], tg: ["ultrabook", "oled", "premium"], cl: ["Steel"], v: "storage", dd: 3 },
  { t: "Kestrel Forge 16 Creator", st: "Colour-calibrated for editors and 3D", b: "kestrel", c: "electronics", s: "laptops", p: 164999, m: 189999, r: 4.6, rc: 512, stk: 7, pool: "laptops", io: 6, bd: ["handpicked"], tg: ["creator", "workstation"], cl: ["Charcoal"], v: "storage", dd: 4 },
  { t: "Kestrel Pulse 15", st: "The dependable everyday work laptop", b: "kestrel", c: "electronics", s: "laptops", p: 54999, m: 66999, r: 4.4, rc: 4310, stk: 42, pool: "laptops", io: 1, bd: ["bestseller"], tg: ["work", "value"], cl: ["Steel", "Charcoal"], v: "storage", dd: 2 },
  { t: "Orbo Slate Book 13", st: "Detachable 2-in-1 with pen support", b: "orbo", c: "electronics", s: "laptops", p: 62999, m: 74999, r: 4.3, rc: 980, stk: 21, pool: "laptops", io: 4, tg: ["2-in-1", "student"], cl: ["Ivory", "Ink Black"], v: "storage", dd: 3 },
  { t: "Orbo Chrome Book 13", st: "Boots in 6 seconds, lasts all day", b: "orbo", c: "electronics", s: "laptops", p: 27999, m: 34999, r: 4.1, rc: 2210, stk: 66, pool: "laptops", io: 7, tg: ["student", "budget"], cl: ["Sand", "Steel"], v: "storage", dd: 2 },
  { t: "Kestrel Aero Air 13", st: "Fanless, silent, endlessly portable", b: "kestrel", c: "electronics", s: "laptops", p: 74999, m: 84999, r: 4.5, rc: 1320, stk: 19, pool: "laptops", io: 2, tg: ["ultrabook", "silent"], cl: ["Pearl", "Midnight"], v: "storage", dd: 2 },

  // ------------------------------- Audio -------------------------------
  { t: "Novair Solace ANC", st: "Over-ear ANC with 60-hour playback", b: "novair", c: "electronics", s: "audio", p: 14999, m: 19999, r: 4.6, rc: 7420, stk: 54, pool: "audio", io: 0, bd: ["bestseller", "trending"], tg: ["anc", "over-ear", "wireless"], cl: ["Ink Black", "Sand", "Peacock"], v: "none", dd: 1 },
  { t: "Novair Solace Lite", st: "Lightweight ANC for daily commutes", b: "novair", c: "electronics", s: "audio", p: 6999, m: 9999, r: 4.4, rc: 5310, stk: 130, pool: "audio", io: 3, bd: ["bestseller"], tg: ["anc", "value"], cl: ["Charcoal", "Ivory"], v: "none", dd: 1 },
  { t: "Novair Drift Buds Pro", st: "Adaptive ANC · spatial audio · 8h", b: "novair", c: "electronics", s: "audio", p: 9999, m: 13999, r: 4.5, rc: 9840, stk: 78, pool: "audio", io: 6, bd: ["trending"], tg: ["tws", "anc", "spatial"], cl: ["Pearl", "Ink Black"], v: "none", dd: 1 },
  { t: "Novair Drift Buds", st: "Half-in-ear buds that never fall out", b: "novair", c: "electronics", s: "audio", p: 3499, m: 5999, r: 4.2, rc: 14210, stk: 240, pool: "audio", io: 1, bd: ["bestseller"], tg: ["tws", "budget"], cl: ["Pearl", "Peacock"], v: "none", dd: 1 },
  { t: "Novair Hum 300 Speaker", st: "360-degree sound, IP67, 24h battery", b: "novair", c: "electronics", s: "audio", p: 11999, m: 15999, r: 4.5, rc: 2130, stk: 37, pool: "audio", io: 4, tg: ["speaker", "waterproof"], cl: ["Forest", "Charcoal", "Rust"], v: "none", dd: 2 },
  { t: "Novair Studio One Monitors", st: "Near-field reference pair for desks", b: "novair", c: "electronics", s: "audio", p: 24999, m: 29999, r: 4.7, rc: 410, stk: 12, pool: "audio", io: 7, bd: ["handpicked"], tg: ["studio", "monitors"], cl: ["Ink Black"], v: "none", dd: 4 },
  { t: "Orbo Beat Clip", st: "Open-ear clips for runners", b: "orbo", c: "electronics", s: "audio", p: 5499, m: 7999, r: 4.1, rc: 1620, stk: 95, pool: "audio", io: 2, bd: ["new"], tg: ["tws", "sport", "open-ear"], cl: ["Marigold", "Ink Black"], v: "none", dd: 2 },

  // ----------------------------- Wearables -----------------------------
  { t: "Orbo Arc 2", st: "AMOLED · ECG · 14-day battery", b: "orbo", c: "electronics", s: "wearables", p: 18999, m: 24999, r: 4.5, rc: 3820, stk: 44, pool: "wearables", io: 0, bd: ["bestseller"], tg: ["smartwatch", "health"], cl: ["Ink Black", "Silver", "Peacock"], v: "size", dd: 1 },
  { t: "Orbo Arc Fit", st: "Training-first watch with dual-band GPS", b: "orbo", c: "electronics", s: "wearables", p: 12999, m: 16999, r: 4.4, rc: 2210, stk: 61, pool: "wearables", io: 3, tg: ["smartwatch", "gps", "sport"], cl: ["Charcoal", "Marigold"], v: "size", dd: 2 },
  { t: "Orbo Arc Luxe", st: "Sapphire glass with a milanese strap", b: "orbo", c: "electronics", s: "wearables", p: 29999, m: 36999, r: 4.6, rc: 690, stk: 11, pool: "wearables", io: 5, bd: ["exclusive"], tg: ["smartwatch", "premium"], cl: ["Gold", "Silver"], v: "size", dd: 3 },
  { t: "Novair Band 5", st: "Slim fitness band with SpO2 tracking", b: "novair", c: "electronics", s: "wearables", p: 2999, m: 4499, r: 4.2, rc: 18320, stk: 320, pool: "wearables", io: 1, bd: ["bestseller"], tg: ["band", "budget"], cl: ["Ink Black", "Rose"], v: "none", dd: 1 },
  { t: "Orbo Arc SE", st: "Essential smartwatch features, half the price", b: "orbo", c: "electronics", s: "wearables", p: 8999, m: 11999, r: 4.3, rc: 4120, stk: 88, pool: "wearables", io: 4, tg: ["smartwatch", "value"], cl: ["Midnight", "Sand"], v: "size", dd: 2 },

  // ------------------------------ Cameras ------------------------------
  { t: "Mistral M300 Mirrorless", st: "33MP full-frame · 8-stop stabilisation", b: "mistral", c: "electronics", s: "cameras", p: 189999, m: 214999, r: 4.8, rc: 340, stk: 5, pool: "cameras", io: 0, bd: ["handpicked", "limited"], tg: ["camera", "full-frame"], cl: ["Ink Black"], v: "none", dd: 4, w: "2 year international warranty" },
  { t: "Mistral M100 Compact", st: "Pocketable APS-C for street shooters", b: "mistral", c: "electronics", s: "cameras", p: 79999, m: 92999, r: 4.6, rc: 620, stk: 14, pool: "cameras", io: 2, bd: ["trending"], tg: ["camera", "compact"], cl: ["Silver", "Ink Black"], v: "none", dd: 3 },
  { t: "Mistral Prime 35mm f/1.8", st: "The one lens that lives on your body", b: "mistral", c: "electronics", s: "cameras", p: 42999, m: 49999, r: 4.7, rc: 480, stk: 22, pool: "cameras", io: 1, tg: ["lens", "prime"], cl: ["Ink Black"], v: "none", dd: 3 },
  { t: "Mistral Vlog Kit", st: "Body, wide lens, mic and grip in one box", b: "mistral", c: "electronics", s: "cameras", p: 96999, m: 118999, r: 4.5, rc: 210, stk: 8, pool: "cameras", io: 3, bd: ["new"], tg: ["camera", "creator", "kit"], cl: ["Ink Black"], v: "none", dd: 4 },

  // ---------------------------- Womenswear -----------------------------
  { t: "Saanjh Chanderi Kurta Set", st: "Hand-block printed, with dupatta", b: "saanjh", c: "fashion", s: "women", p: 3899, m: 5999, r: 4.5, rc: 1820, stk: 46, pool: "womenwear", io: 0, bd: ["bestseller"], tg: ["ethnic", "handblock", "festive"], cl: ["Ivory", "Marigold", "Peacock"], v: "size", dd: 3 },
  { t: "Saanjh Linen Co-ord Set", st: "Breathable summer tailoring", b: "saanjh", c: "fashion", s: "women", p: 4299, m: 6499, r: 4.4, rc: 940, stk: 32, pool: "womenwear", io: 3, bd: ["trending"], tg: ["linen", "co-ord", "summer"], cl: ["Sand", "Sage", "Ivory"], v: "size", dd: 3 },
  { t: "Loomcraft Kota Doria Saree", st: "Handwoven in Kaithoon, Rajasthan", b: "loomcraft", c: "fashion", s: "women", p: 6499, m: 8999, r: 4.7, rc: 620, stk: 18, pool: "womenwear", io: 6, bd: ["handpicked", "limited"], tg: ["saree", "handloom", "festive"], cl: ["Rose", "Peacock", "Cream"], v: "none", dd: 5 },
  { t: "Saanjh Slip Dress", st: "Bias-cut satin that moves with you", b: "saanjh", c: "fashion", s: "women", p: 2999, m: 4599, r: 4.3, rc: 1210, stk: 54, pool: "womenwear", io: 1, tg: ["dress", "party"], cl: ["Wine", "Ink Black", "Blush"], v: "size", dd: 2 },
  { t: "Loomcraft Ikat Wrap Top", st: "Pochampally ikat, cut modern", b: "loomcraft", c: "fashion", s: "women", p: 2299, m: 3299, r: 4.4, rc: 480, stk: 27, pool: "womenwear", io: 4, tg: ["ikat", "handloom"], cl: ["Indigo", "Rust"], v: "size", dd: 4 },
  { t: "Saanjh Anarkali Set", st: "Floor-length, fully lined, festive", b: "saanjh", c: "fashion", s: "women", p: 8999, m: 13999, r: 4.6, rc: 380, stk: 12, pool: "womenwear", io: 5, bd: ["exclusive"], tg: ["ethnic", "festive", "wedding"], cl: ["Wine", "Forest"], v: "size", dd: 5 },
  { t: "Saanjh Everyday Kurta", st: "Cotton mul, pockets, no fuss", b: "saanjh", c: "fashion", s: "women", p: 1499, m: 2299, r: 4.3, rc: 4210, stk: 180, pool: "womenwear", io: 2, bd: ["bestseller"], tg: ["cotton", "everyday"], cl: ["Ivory", "Sage", "Terracotta"], v: "size", dd: 2 },

  // ------------------------------ Menswear -----------------------------
  { t: "Loomcraft Khadi Shirt", st: "Handspun khadi, garment dyed", b: "loomcraft", c: "fashion", s: "men", p: 2499, m: 3499, r: 4.5, rc: 1620, stk: 64, pool: "menwear", io: 0, bd: ["bestseller"], tg: ["khadi", "shirt", "handloom"], cl: ["Ivory", "Indigo", "Olive"], v: "size", dd: 3 },
  { t: "Loomcraft Oxford Shirt", st: "Heavier oxford weave, softens with wear", b: "loomcraft", c: "fashion", s: "men", p: 2799, m: 3999, r: 4.4, rc: 890, stk: 51, pool: "menwear", io: 3, tg: ["shirt", "office"], cl: ["Pearl", "Midnight"], v: "size", dd: 2 },
  { t: "Terra Nine Tech Chino", st: "4-way stretch, water-repellent", b: "terra-nine", c: "fashion", s: "men", p: 3199, m: 4499, r: 4.4, rc: 1120, stk: 73, pool: "menwear", io: 1, bd: ["trending"], tg: ["trousers", "travel"], cl: ["Charcoal", "Sand", "Olive"], v: "size", dd: 2 },
  { t: "Loomcraft Heavy Tee", st: "240 GSM combed cotton, boxy fit", b: "loomcraft", c: "fashion", s: "men", p: 1299, m: 1899, r: 4.5, rc: 5420, stk: 210, pool: "menwear", io: 4, bd: ["bestseller"], tg: ["tshirt", "everyday"], cl: ["Ink Black", "Ivory", "Forest"], v: "size", dd: 2 },
  { t: "Indus Forge Suede Jacket", st: "Goat suede with a quilted lining", b: "indus-forge", c: "fashion", s: "men", p: 12999, m: 18999, r: 4.6, rc: 240, stk: 9, pool: "menwear", io: 2, bd: ["limited", "handpicked"], tg: ["jacket", "leather", "winter"], cl: ["Rust", "Charcoal"], v: "size", dd: 5 },
  { t: "Terra Nine Merino Half-Zip", st: "Odour-resistant merino for travel", b: "terra-nine", c: "fashion", s: "men", p: 4999, m: 6999, r: 4.5, rc: 410, stk: 26, pool: "menwear", io: 5, tg: ["knitwear", "merino"], cl: ["Midnight", "Sand"], v: "size", dd: 3 },

  // ------------------------------ Footwear -----------------------------
  { t: "Terra Nine Trail Runner 3", st: "Grippy outsole tuned for Indian trails", b: "terra-nine", c: "fashion", s: "footwear", p: 6999, m: 9499, r: 4.6, rc: 2820, stk: 48, pool: "footwear", io: 0, bd: ["bestseller", "trending"], tg: ["running", "trail"], cl: ["Marigold", "Forest", "Ink Black"], v: "shoe", dd: 2 },
  { t: "Terra Nine Road 5", st: "Daily trainer with 8mm drop", b: "terra-nine", c: "fashion", s: "footwear", p: 5499, m: 7499, r: 4.5, rc: 3910, stk: 92, pool: "footwear", io: 3, bd: ["bestseller"], tg: ["running", "road"], cl: ["Peacock", "Charcoal"], v: "shoe", dd: 2 },
  { t: "Terra Nine Court Low", st: "Clean leather sneaker, all-day sole", b: "terra-nine", c: "fashion", s: "footwear", p: 4299, m: 5999, r: 4.4, rc: 1720, stk: 76, pool: "footwear", io: 6, tg: ["sneaker", "everyday"], cl: ["Pearl", "Ink Black"], v: "shoe", dd: 2 },
  { t: "Indus Forge Penny Loafer", st: "Hand-stitched, Goodyear welted", b: "indus-forge", c: "fashion", s: "footwear", p: 8999, m: 12499, r: 4.7, rc: 520, stk: 17, pool: "footwear", io: 1, bd: ["handpicked"], tg: ["formal", "leather"], cl: ["Copper", "Ink Black"], v: "shoe", dd: 4 },
  { t: "Indus Forge Kolhapuri", st: "Handmade in Kolhapur, vegetable tanned", b: "indus-forge", c: "fashion", s: "footwear", p: 2799, m: 3799, r: 4.4, rc: 1310, stk: 58, pool: "footwear", io: 4, tg: ["ethnic", "handmade"], cl: ["Copper", "Rust"], v: "shoe", dd: 3 },
  { t: "Peak & Pine Trek Boot", st: "Waterproof mid-cut for monsoon treks", b: "peak-pine", c: "fashion", s: "footwear", p: 9499, m: 12999, r: 4.5, rc: 640, stk: 23, pool: "footwear", io: 2, tg: ["trek", "waterproof"], cl: ["Olive", "Charcoal"], v: "shoe", dd: 4 },

  // -------------------------------- Bags -------------------------------
  { t: "Indus Forge Weekender", st: "Full-grain leather, 45L, cabin friendly", b: "indus-forge", c: "fashion", s: "bags", p: 14999, m: 19999, r: 4.7, rc: 410, stk: 13, pool: "bags", io: 0, bd: ["handpicked", "limited"], tg: ["travel", "leather"], cl: ["Copper", "Ink Black"], v: "none", dd: 4, w: "Lifetime hardware warranty" },
  { t: "Indus Forge Everyday Tote", st: "Fits a 15\" laptop and everything else", b: "indus-forge", c: "fashion", s: "bags", p: 7999, m: 10999, r: 4.6, rc: 980, stk: 34, pool: "bags", io: 3, bd: ["bestseller"], tg: ["tote", "leather", "work"], cl: ["Sand", "Wine", "Ink Black"], v: "none", dd: 3 },
  { t: "Peak & Pine Commuter 22L", st: "Rolltop pack with a padded sleeve", b: "peak-pine", c: "fashion", s: "bags", p: 4499, m: 6499, r: 4.5, rc: 1620, stk: 87, pool: "bags", io: 1, bd: ["trending"], tg: ["backpack", "commute"], cl: ["Charcoal", "Forest"], v: "none", dd: 2 },
  { t: "Loomcraft Jute Market Bag", st: "Handwoven jute with cotton straps", b: "loomcraft", c: "fashion", s: "bags", p: 899, m: 1399, r: 4.3, rc: 2210, stk: 240, pool: "bags", io: 4, tg: ["sustainable", "everyday"], cl: ["Cream", "Terracotta"], v: "none", dd: 2 },

  // ------------------------------- Watches -----------------------------
  { t: "Sundara Meridian Automatic", st: "Sapphire crystal · 41h power reserve", b: "sundara", c: "fashion", s: "watches", p: 24999, m: 32999, r: 4.7, rc: 320, stk: 11, pool: "wearables", io: 2, bd: ["handpicked", "exclusive"], tg: ["automatic", "dress"], cl: ["Silver", "Gold"], v: "none", dd: 4, w: "3 year movement warranty" },
  { t: "Sundara Field Quartz", st: "38mm field watch on a canvas strap", b: "sundara", c: "fashion", s: "watches", p: 8999, m: 12999, r: 4.5, rc: 610, stk: 29, pool: "wearables", io: 5, tg: ["quartz", "field"], cl: ["Olive", "Sand"], v: "none", dd: 3 },
  { t: "Sundara Slim Dress Watch", st: "6.8mm case, minimal dial", b: "sundara", c: "fashion", s: "watches", p: 12999, m: 17999, r: 4.6, rc: 240, stk: 16, pool: "wearables", io: 1, tg: ["dress", "minimal"], cl: ["Gold", "Silver"], v: "none", dd: 3 },

  // ----------------------------- Furniture -----------------------------
  { t: "Bloom & Barn Nook 2-Seater", st: "Compact sofa for city apartments", b: "bloom-barn", c: "home-living", s: "furniture", p: 34999, m: 46999, r: 4.5, rc: 620, stk: 8, pool: "furniture", io: 0, bd: ["bestseller"], tg: ["sofa", "living-room"], cl: ["Sage", "Sand", "Charcoal"], v: "none", dd: 8, w: "3 year frame warranty" },
  { t: "Bloom & Barn Terra Bed", st: "Solid sheesham with hydraulic storage", b: "bloom-barn", c: "home-living", s: "furniture", p: 52999, m: 68999, r: 4.6, rc: 410, stk: 5, pool: "furniture", io: 3, bd: ["handpicked"], tg: ["bed", "storage", "solid-wood"], cl: ["Copper", "Charcoal"], v: "size", dd: 12 },
  { t: "Bloom & Barn Study Desk", st: "Cable-managed desk with a wire tray", b: "bloom-barn", c: "home-living", s: "furniture", p: 16999, m: 22999, r: 4.4, rc: 890, stk: 22, pool: "furniture", io: 6, bd: ["trending"], tg: ["desk", "work-from-home"], cl: ["Sand", "Ink Black"], v: "none", dd: 7 },
  { t: "Studio Vayu Cane Lounge Chair", st: "Hand-caned back on a teak frame", b: "studio-vayu", c: "home-living", s: "furniture", p: 21999, m: 28999, r: 4.7, rc: 180, stk: 6, pool: "furniture", io: 1, bd: ["limited", "handpicked"], tg: ["chair", "cane", "artisanal"], cl: ["Cream", "Copper"], v: "none", dd: 10 },
  { t: "Bloom & Barn Shoe Cabinet", st: "Three-tier tilt storage, 18 pairs", b: "bloom-barn", c: "home-living", s: "furniture", p: 11999, m: 15999, r: 4.3, rc: 720, stk: 31, pool: "furniture", io: 4, tg: ["storage", "entryway"], cl: ["Ivory", "Sand"], v: "none", dd: 7 },
  { t: "Bloom & Barn Nesting Tables", st: "Set of two, mango wood and iron", b: "bloom-barn", c: "home-living", s: "furniture", p: 8999, m: 12499, r: 4.4, rc: 540, stk: 27, pool: "furniture", io: 7, tg: ["table", "living-room"], cl: ["Copper", "Ink Black"], v: "none", dd: 6 },

  // ------------------------------- Decor -------------------------------
  { t: "Studio Vayu Arc Floor Lamp", st: "Brushed brass with a linen shade", b: "studio-vayu", c: "home-living", s: "decor", p: 12999, m: 17999, r: 4.6, rc: 320, stk: 14, pool: "decor", io: 0, bd: ["handpicked"], tg: ["lighting", "brass"], cl: ["Gold", "Ink Black"], v: "none", dd: 6 },
  { t: "Studio Vayu Stoneware Vase", st: "Wheel-thrown, reactive glaze", b: "studio-vayu", c: "home-living", s: "decor", p: 2499, m: 3499, r: 4.5, rc: 610, stk: 42, pool: "decor", io: 2, tg: ["ceramic", "vase"], cl: ["Cream", "Peacock", "Terracotta"], v: "size", dd: 4 },
  { t: "Kavya Arched Wall Mirror", st: "Solid wood frame, 90cm tall", b: "kavya", c: "home-living", s: "decor", p: 7999, m: 11499, r: 4.4, rc: 380, stk: 19, pool: "decor", io: 4, bd: ["trending"], tg: ["mirror", "wall"], cl: ["Copper", "Ink Black"], v: "none", dd: 6 },
  { t: "Studio Vayu Terrazzo Coasters", st: "Set of four, hand-poured", b: "studio-vayu", c: "home-living", s: "decor", p: 1299, m: 1899, r: 4.3, rc: 720, stk: 96, pool: "decor", io: 1, tg: ["table", "gift"], cl: ["Cream", "Sage"], v: "none", dd: 3 },
  { t: "Kavya Block Print Wall Art", st: "Framed hand-block print, A2", b: "kavya", c: "home-living", s: "decor", p: 3499, m: 4999, r: 4.4, rc: 210, stk: 28, pool: "decor", io: 5, tg: ["art", "handblock"], cl: ["Indigo", "Terracotta"], v: "none", dd: 5 },

  // ------------------------------ Bedding ------------------------------
  { t: "Kavya 400TC Cotton Bedsheet", st: "Sateen weave, king, with two covers", b: "kavya", c: "home-living", s: "bedding", p: 3499, m: 4999, r: 4.5, rc: 2310, stk: 88, pool: "decor", io: 3, bd: ["bestseller"], tg: ["bedsheet", "cotton"], cl: ["Ivory", "Sage", "Blush"], v: "size", dd: 3 },
  { t: "Kavya Muslin Summer Quilt", st: "Six-layer muslin dohar, feather light", b: "kavya", c: "home-living", s: "bedding", p: 2999, m: 4299, r: 4.6, rc: 1420, stk: 64, pool: "decor", io: 5, bd: ["trending"], tg: ["quilt", "summer"], cl: ["Cream", "Peacock"], v: "size", dd: 3 },
  { t: "Kavya Turkish Bath Towels", st: "Set of two, 600 GSM, quick dry", b: "kavya", c: "home-living", s: "bedding", p: 1899, m: 2799, r: 4.4, rc: 1810, stk: 120, pool: "decor", io: 1, tg: ["towel", "bath"], cl: ["Sand", "Charcoal", "Ivory"], v: "none", dd: 2 },

  // -------------------------------- Rugs -------------------------------
  { t: "Loomcraft Dhurrie Rug 5x7", st: "Flat-woven cotton, reversible", b: "loomcraft", c: "home-living", s: "rugs", p: 6999, m: 9999, r: 4.5, rc: 420, stk: 21, pool: "furniture", io: 2, bd: ["handpicked"], tg: ["rug", "handloom"], cl: ["Indigo", "Terracotta", "Sage"], v: "size", dd: 6 },
  { t: "Loomcraft Jute Round Rug", st: "Hand-braided jute, 150cm", b: "loomcraft", c: "home-living", s: "rugs", p: 4499, m: 6499, r: 4.3, rc: 310, stk: 33, pool: "furniture", io: 5, tg: ["rug", "jute"], cl: ["Cream"], v: "size", dd: 5 },
  { t: "Kavya Velvet Cushion Covers", st: "Set of four, hidden zip, 16 inch", b: "kavya", c: "home-living", s: "rugs", p: 1599, m: 2399, r: 4.4, rc: 1920, stk: 140, pool: "furniture", io: 7, tg: ["cushion", "velvet"], cl: ["Forest", "Wine", "Marigold"], v: "none", dd: 3 },

  // ------------------------------ Cookware -----------------------------
  { t: "Copperleaf Triply Kadai", st: "Steel-aluminium-steel, induction ready", b: "copperleaf", c: "kitchen", s: "cookware", p: 3299, m: 4599, r: 4.6, rc: 3210, stk: 76, pool: "kitchen", io: 0, bd: ["bestseller"], tg: ["kadai", "triply", "induction"], cl: ["Silver"], v: "size", dd: 2, w: "Lifetime warranty on the base" },
  { t: "Copperleaf Cast Iron Tawa", st: "Pre-seasoned, 26cm, gets better with use", b: "copperleaf", c: "kitchen", s: "cookware", p: 1899, m: 2699, r: 4.7, rc: 5420, stk: 130, pool: "kitchen", io: 2, bd: ["bestseller", "trending"], tg: ["tawa", "cast-iron"], cl: ["Ink Black"], v: "size", dd: 2 },
  { t: "Copperleaf Triply Cookware Set", st: "Five pieces that cover every Indian dish", b: "copperleaf", c: "kitchen", s: "cookware", p: 11999, m: 16999, r: 4.6, rc: 940, stk: 24, pool: "kitchen", io: 4, bd: ["handpicked"], tg: ["set", "triply"], cl: ["Silver"], v: "none", dd: 3 },
  { t: "Copperleaf Nonstick Dosa Tawa", st: "Ceramic-reinforced, PFOA-free", b: "copperleaf", c: "kitchen", s: "cookware", p: 2199, m: 3199, r: 4.4, rc: 2610, stk: 98, pool: "kitchen", io: 1, tg: ["tawa", "nonstick"], cl: ["Charcoal"], v: "size", dd: 2 },
  { t: "Copperleaf Pressure Cooker 5L", st: "Stainless, induction base, safety valve", b: "copperleaf", c: "kitchen", s: "cookware", p: 3899, m: 5299, r: 4.5, rc: 4120, stk: 61, pool: "kitchen", io: 5, bd: ["bestseller"], tg: ["cooker", "steel"], cl: ["Silver"], v: "size", dd: 2 },

  // ----------------------------- Appliances ----------------------------
  { t: "Orbo Mixer Grinder Pro", st: "1000W with four jars and a spice mill", b: "orbo", c: "kitchen", s: "appliances", p: 6499, m: 8999, r: 4.4, rc: 3820, stk: 44, pool: "kitchen", io: 3, bd: ["bestseller"], tg: ["mixer", "grinder"], cl: ["Ink Black", "Pearl"], v: "none", dd: 3, w: "5 year motor warranty" },
  { t: "Orbo Air Fryer 6L", st: "Family sized with a preset for samosa", b: "orbo", c: "kitchen", s: "appliances", p: 8999, m: 12999, r: 4.5, rc: 2140, stk: 37, pool: "kitchen", io: 0, bd: ["trending"], tg: ["airfryer", "healthy"], cl: ["Ink Black"], v: "none", dd: 3 },
  { t: "Copperleaf Pour-Over Kit", st: "Dripper, server, filters and scale", b: "copperleaf", c: "kitchen", s: "appliances", p: 4299, m: 5999, r: 4.6, rc: 610, stk: 29, pool: "kitchen", io: 2, bd: ["handpicked"], tg: ["coffee", "brewing"], cl: ["Cream", "Ink Black"], v: "none", dd: 3 },
  { t: "Orbo Electric Kettle 1.7L", st: "Double-walled, cool touch body", b: "orbo", c: "kitchen", s: "appliances", p: 2299, m: 3299, r: 4.3, rc: 4820, stk: 140, pool: "kitchen", io: 5, tg: ["kettle", "everyday"], cl: ["Silver", "Ink Black"], v: "none", dd: 2 },

  // ------------------------------- Dining ------------------------------
  { t: "Studio Vayu Stoneware Dinner Set", st: "18 pieces, microwave and dishwasher safe", b: "studio-vayu", c: "kitchen", s: "dining", p: 7999, m: 11999, r: 4.6, rc: 720, stk: 26, pool: "kitchen", io: 4, bd: ["handpicked"], tg: ["dinner-set", "ceramic"], cl: ["Cream", "Peacock"], v: "none", dd: 4 },
  { t: "Studio Vayu Handblown Glasses", st: "Set of six, slight variation by design", b: "studio-vayu", c: "kitchen", s: "dining", p: 2499, m: 3499, r: 4.4, rc: 410, stk: 58, pool: "kitchen", io: 1, tg: ["glassware", "artisanal"], cl: ["Pearl", "Sage"], v: "none", dd: 4 },
  { t: "Copperleaf Brass Serving Platter", st: "Hand-beaten, food-safe lacquer", b: "copperleaf", c: "kitchen", s: "dining", p: 3299, m: 4699, r: 4.5, rc: 280, stk: 34, pool: "kitchen", io: 3, tg: ["brass", "serveware"], cl: ["Gold"], v: "size", dd: 5 },

  // ------------------------------ Storage ------------------------------
  { t: "Copperleaf Airtight Jar Set", st: "Borosilicate with bamboo lids, set of six", b: "copperleaf", c: "kitchen", s: "storage", p: 2799, m: 3999, r: 4.5, rc: 1620, stk: 88, pool: "kitchen", io: 5, bd: ["trending"], tg: ["storage", "glass"], cl: ["Cream"], v: "none", dd: 3 },
  { t: "Copperleaf Steel Masala Dabba", st: "Seven-container spice box with spoon", b: "copperleaf", c: "kitchen", s: "storage", p: 1499, m: 2199, r: 4.6, rc: 3910, stk: 160, pool: "kitchen", io: 2, bd: ["bestseller"], tg: ["spice", "steel"], cl: ["Silver"], v: "none", dd: 2 },
  { t: "Studio Vayu Cane Basket Trio", st: "Nesting storage for shelves and counters", b: "studio-vayu", c: "kitchen", s: "storage", p: 2199, m: 3199, r: 4.3, rc: 340, stk: 47, pool: "kitchen", io: 0, tg: ["basket", "cane"], cl: ["Cream"], v: "none", dd: 4 },

  // ------------------------------ Skincare -----------------------------
  { t: "Nirvaan Vitamin C Serum", st: "10% THD ascorbate, non-irritating", b: "nirvaan", c: "beauty", s: "skincare", p: 1299, m: 1899, r: 4.5, rc: 6210, stk: 210, pool: "beauty", io: 0, bd: ["bestseller", "trending"], tg: ["serum", "vitamin-c", "brightening"], cl: [], v: "ml", dd: 2 },
  { t: "Nirvaan Mineral Sunscreen SPF 50", st: "No white cast on Indian skin tones", b: "nirvaan", c: "beauty", s: "skincare", p: 899, m: 1299, r: 4.6, rc: 9820, stk: 340, pool: "beauty", io: 2, bd: ["bestseller"], tg: ["sunscreen", "spf50"], cl: [], v: "ml", dd: 1 },
  { t: "Nirvaan Ceramide Moisturiser", st: "Barrier repair for humid climates", b: "nirvaan", c: "beauty", s: "skincare", p: 1099, m: 1599, r: 4.5, rc: 4310, stk: 180, pool: "beauty", io: 4, tg: ["moisturiser", "ceramide"], cl: [], v: "ml", dd: 2 },
  { t: "Nirvaan Ubtan Cleanser", st: "Gram flour and turmeric, reformulated", b: "nirvaan", c: "beauty", s: "skincare", p: 649, m: 999, r: 4.4, rc: 5120, stk: 260, pool: "beauty", io: 1, bd: ["trending"], tg: ["cleanser", "ayurveda"], cl: [], v: "ml", dd: 2 },
  { t: "Nirvaan Retinal Night Cream", st: "0.1% retinaldehyde, slow-release", b: "nirvaan", c: "beauty", s: "skincare", p: 1799, m: 2499, r: 4.4, rc: 1820, stk: 74, pool: "beauty", io: 6, bd: ["new"], tg: ["retinol", "anti-ageing"], cl: [], v: "ml", dd: 2 },

  // ------------------------------ Haircare -----------------------------
  { t: "Nirvaan Bhringraj Hair Oil", st: "Cold-pressed, cured in the sun", b: "nirvaan", c: "beauty", s: "haircare", p: 749, m: 1099, r: 4.6, rc: 7210, stk: 290, pool: "beauty", io: 3, bd: ["bestseller"], tg: ["hair-oil", "ayurveda"], cl: [], v: "ml", dd: 2 },
  { t: "Nirvaan Rosemary Scalp Serum", st: "Daily leave-in for thinning hairlines", b: "nirvaan", c: "beauty", s: "haircare", p: 999, m: 1499, r: 4.4, rc: 3120, stk: 150, pool: "beauty", io: 5, bd: ["trending"], tg: ["scalp", "growth"], cl: [], v: "ml", dd: 2 },
  { t: "Nirvaan Sulphate-Free Shampoo", st: "Gentle enough for coloured hair", b: "nirvaan", c: "beauty", s: "haircare", p: 799, m: 1199, r: 4.3, rc: 4210, stk: 220, pool: "beauty", io: 7, tg: ["shampoo", "sulphate-free"], cl: [], v: "ml", dd: 2 },

  // ----------------------------- Fragrance -----------------------------
  { t: "Sundara Mitti Attar", st: "Petrichor, vetiver and warm sandalwood", b: "sundara", c: "beauty", s: "fragrance", p: 2499, m: 3499, r: 4.7, rc: 820, stk: 46, pool: "beauty", io: 4, bd: ["handpicked", "exclusive"], tg: ["attar", "unisex"], cl: [], v: "ml", dd: 3 },
  { t: "Sundara Neroli Eau de Parfum", st: "Bright citrus opening, musk dry-down", b: "sundara", c: "beauty", s: "fragrance", p: 3299, m: 4599, r: 4.5, rc: 610, stk: 38, pool: "beauty", io: 1, tg: ["edp", "citrus"], cl: [], v: "ml", dd: 3 },
  { t: "Sundara Oudh Noir", st: "Deep oudh for evenings and weddings", b: "sundara", c: "beauty", s: "fragrance", p: 4499, m: 5999, r: 4.6, rc: 340, stk: 22, pool: "beauty", io: 6, bd: ["limited"], tg: ["oudh", "evening"], cl: [], v: "ml", dd: 3 },

  // ------------------------------ Wellness -----------------------------
  { t: "Nirvaan Ashwagandha Capsules", st: "KSM-66 root extract, 60 capsules", b: "nirvaan", c: "beauty", s: "wellness", p: 899, m: 1299, r: 4.4, rc: 3810, stk: 190, pool: "beauty", io: 2, bd: ["bestseller"], tg: ["supplement", "stress"], cl: [], v: "none", dd: 2 },
  { t: "Nirvaan Tulsi Green Tea", st: "Whole-leaf blend, 100 servings", b: "nirvaan", c: "beauty", s: "wellness", p: 599, m: 899, r: 4.3, rc: 2110, stk: 240, pool: "beauty", io: 0, tg: ["tea", "wellness"], cl: [], v: "none", dd: 2 },
  { t: "Studio Vayu Gua Sha Stone", st: "Hand-cut green aventurine with a pouch", b: "studio-vayu", c: "beauty", s: "wellness", p: 1199, m: 1799, r: 4.4, rc: 920, stk: 84, pool: "beauty", io: 5, tg: ["tools", "self-care"], cl: ["Sage"], v: "none", dd: 3 },

  // ------------------------------ Earrings -----------------------------
  { t: "Sundara Pearl Drop Jhumkas", st: "925 silver with freshwater pearls", b: "sundara", c: "jewellery", s: "earrings", p: 3499, m: 4999, r: 4.6, rc: 940, stk: 34, pool: "jewellery", io: 0, bd: ["bestseller"], tg: ["silver", "jhumka", "festive"], cl: ["Silver", "Gold"], v: "none", dd: 3, w: "Lifetime replating" },
  { t: "Sundara Everyday Huggies", st: "18k gold plated, hypoallergenic", b: "sundara", c: "jewellery", s: "earrings", p: 1899, m: 2799, r: 4.5, rc: 2210, stk: 120, pool: "jewellery", io: 2, bd: ["trending"], tg: ["hoops", "everyday"], cl: ["Gold", "Silver"], v: "none", dd: 2 },
  { t: "Sundara Chandbali Set", st: "Statement chandbalis with kundan work", b: "sundara", c: "jewellery", s: "earrings", p: 6999, m: 9999, r: 4.7, rc: 320, stk: 14, pool: "jewellery", io: 4, bd: ["exclusive", "limited"], tg: ["kundan", "wedding"], cl: ["Gold"], v: "none", dd: 4 },

  // ----------------------------- Necklaces -----------------------------
  { t: "Sundara Layered Chain Set", st: "Three stackable chains, one clasp", b: "sundara", c: "jewellery", s: "necklaces", p: 2999, m: 4499, r: 4.5, rc: 1120, stk: 62, pool: "jewellery", io: 1, bd: ["bestseller"], tg: ["chain", "layered"], cl: ["Gold", "Silver"], v: "size", dd: 3 },
  { t: "Sundara Emerald Pendant", st: "Lab-grown emerald in 925 silver", b: "sundara", c: "jewellery", s: "necklaces", p: 5499, m: 7999, r: 4.6, rc: 410, stk: 21, pool: "jewellery", io: 3, bd: ["handpicked"], tg: ["pendant", "emerald"], cl: ["Silver"], v: "size", dd: 4 },
  { t: "Studio Vayu Brass Torque", st: "Hand-forged neckpiece, adjustable", b: "studio-vayu", c: "jewellery", s: "necklaces", p: 3899, m: 5499, r: 4.4, rc: 180, stk: 17, pool: "jewellery", io: 5, tg: ["brass", "statement"], cl: ["Gold"], v: "none", dd: 5 },

  // -------------------------------- Rings ------------------------------
  { t: "Sundara Stacking Band Trio", st: "Three slim bands, mix and match", b: "sundara", c: "jewellery", s: "rings", p: 2499, m: 3699, r: 4.5, rc: 860, stk: 74, pool: "jewellery", io: 2, bd: ["trending"], tg: ["stacking", "everyday"], cl: ["Gold", "Silver"], v: "ring", dd: 3 },
  { t: "Sundara Signet Ring", st: "Engravable face, 925 silver", b: "sundara", c: "jewellery", s: "rings", p: 3299, m: 4699, r: 4.6, rc: 420, stk: 38, pool: "jewellery", io: 0, tg: ["signet", "unisex"], cl: ["Silver", "Gold"], v: "ring", dd: 4 },
  { t: "Sundara Solitaire Ring", st: "Lab-grown 0.5ct in a six-prong setting", b: "sundara", c: "jewellery", s: "rings", p: 24999, m: 32999, r: 4.8, rc: 140, stk: 6, pool: "jewellery", io: 4, bd: ["exclusive", "limited"], tg: ["solitaire", "engagement"], cl: ["Silver"], v: "ring", dd: 6 },

  // ----------------------------- Bracelets -----------------------------
  { t: "Sundara Tennis Bracelet", st: "Lab-grown stones, secure box clasp", b: "sundara", c: "jewellery", s: "bracelets", p: 8999, m: 12999, r: 4.6, rc: 260, stk: 18, pool: "jewellery", io: 3, bd: ["handpicked"], tg: ["tennis", "occasion"], cl: ["Silver"], v: "size", dd: 4 },
  { t: "Studio Vayu Silver Kada", st: "Solid 925 kada with a matte finish", b: "studio-vayu", c: "jewellery", s: "bracelets", p: 4499, m: 6499, r: 4.5, rc: 380, stk: 29, pool: "jewellery", io: 1, tg: ["kada", "unisex"], cl: ["Silver"], v: "size", dd: 4 },

  // ------------------------------ Training -----------------------------
  { t: "Peak & Pine Hex Dumbbell Set", st: "Rubber-encased pair, 5kg to 20kg", b: "peak-pine", c: "sports", s: "training", p: 5999, m: 8499, r: 4.5, rc: 1420, stk: 42, pool: "fitness", io: 0, bd: ["bestseller"], tg: ["strength", "home-gym"], cl: ["Ink Black"], v: "size", dd: 4, w: "2 year warranty" },
  { t: "Peak & Pine Cork Yoga Mat", st: "6mm cork over natural rubber", b: "peak-pine", c: "sports", s: "training", p: 3499, m: 4999, r: 4.6, rc: 2310, stk: 86, pool: "fitness", io: 2, bd: ["trending"], tg: ["yoga", "sustainable"], cl: ["Cream", "Forest"], v: "none", dd: 2 },
  { t: "Peak & Pine Resistance Band Kit", st: "Five bands, door anchor, carry bag", b: "peak-pine", c: "sports", s: "training", p: 1499, m: 2299, r: 4.4, rc: 3810, stk: 190, pool: "fitness", io: 4, bd: ["bestseller"], tg: ["bands", "travel"], cl: ["Marigold"], v: "none", dd: 2 },
  { t: "Peak & Pine Adjustable Kettlebell", st: "Six weights in one bell, 6kg to 18kg", b: "peak-pine", c: "sports", s: "training", p: 9999, m: 13999, r: 4.5, rc: 640, stk: 23, pool: "fitness", io: 1, bd: ["new"], tg: ["kettlebell", "home-gym"], cl: ["Charcoal"], v: "none", dd: 5 },

  // ------------------------------ Outdoor ------------------------------
  { t: "Peak & Pine Summit 45L Pack", st: "Ventilated back panel, rain cover", b: "peak-pine", c: "sports", s: "outdoor", p: 7499, m: 10499, r: 4.6, rc: 820, stk: 31, pool: "fitness", io: 3, bd: ["handpicked"], tg: ["trekking", "backpack"], cl: ["Forest", "Rust"], v: "none", dd: 4 },
  { t: "Peak & Pine 2P Trekking Tent", st: "Freestanding, 3-season, 2.4kg", b: "peak-pine", c: "sports", s: "outdoor", p: 12999, m: 17999, r: 4.5, rc: 340, stk: 15, pool: "fitness", io: 5, tg: ["tent", "camping"], cl: ["Olive"], v: "none", dd: 5 },
  { t: "Peak & Pine Insulated Bottle 1L", st: "Keeps chai hot for 12 hours", b: "peak-pine", c: "sports", s: "outdoor", p: 1899, m: 2699, r: 4.5, rc: 4210, stk: 210, pool: "fitness", io: 0, bd: ["bestseller"], tg: ["bottle", "steel"], cl: ["Forest", "Ink Black", "Sand"], v: "size", dd: 2 },

  // ----------------------------- Activewear ----------------------------
  { t: "Terra Nine Run Tee", st: "Laser-perforated, weighs almost nothing", b: "terra-nine", c: "sports", s: "activewear", p: 1799, m: 2599, r: 4.4, rc: 1620, stk: 120, pool: "fitness", io: 2, bd: ["trending"], tg: ["running", "tshirt"], cl: ["Peacock", "Ink Black", "Marigold"], v: "size", dd: 2 },
  { t: "Terra Nine Training Shorts", st: "Two-in-one liner with zip pockets", b: "terra-nine", c: "sports", s: "activewear", p: 2199, m: 3199, r: 4.5, rc: 1120, stk: 94, pool: "fitness", io: 4, tg: ["shorts", "gym"], cl: ["Charcoal", "Forest"], v: "size", dd: 2 },
  { t: "Terra Nine Compression Tights", st: "Graduated support for long runs", b: "terra-nine", c: "sports", s: "activewear", p: 2999, m: 4299, r: 4.4, rc: 720, stk: 67, pool: "fitness", io: 1, tg: ["tights", "running"], cl: ["Ink Black", "Midnight"], v: "size", dd: 2 },

  // ------------------------------ Recovery -----------------------------
  { t: "Peak & Pine Massage Gun", st: "Five heads, 40dB, 6-hour battery", b: "peak-pine", c: "sports", s: "recovery", p: 6999, m: 9999, r: 4.5, rc: 1210, stk: 38, pool: "fitness", io: 5, bd: ["trending"], tg: ["recovery", "massage"], cl: ["Ink Black"], v: "none", dd: 3 },
  { t: "Peak & Pine Foam Roller", st: "High-density EVA, 45cm", b: "peak-pine", c: "sports", s: "recovery", p: 1299, m: 1899, r: 4.4, rc: 2110, stk: 140, pool: "fitness", io: 3, tg: ["recovery", "mobility"], cl: ["Charcoal", "Marigold"], v: "size", dd: 2 },

  // ------------------------------ Fiction ------------------------------
  { t: "The Long Monsoon", st: "A novel of Bombay, 1978 — Halcyon Press", b: "halcyon", c: "books", s: "fiction", p: 499, m: 699, r: 4.6, rc: 2310, stk: 140, pool: "books", io: 0, bd: ["bestseller"], tg: ["fiction", "literary", "indian-writing"], cl: [], v: "none", dd: 3 },
  { t: "Salt and Coral", st: "Translated from Malayalam", b: "halcyon", c: "books", s: "fiction", p: 449, m: 599, r: 4.5, rc: 890, stk: 96, pool: "books", io: 2, bd: ["handpicked"], tg: ["fiction", "translated"], cl: [], v: "none", dd: 3 },
  { t: "Nine Hours to Nagpur", st: "Interlinked short stories", b: "halcyon", c: "books", s: "fiction", p: 399, m: 549, r: 4.4, rc: 620, stk: 110, pool: "books", io: 4, tg: ["fiction", "short-stories"], cl: [], v: "none", dd: 3 },

  // ---------------------------- Non-fiction ----------------------------
  { t: "Building in Bharat", st: "How Indian startups actually scale", b: "halcyon", c: "books", s: "non-fiction", p: 599, m: 799, r: 4.5, rc: 1420, stk: 88, pool: "books", io: 1, bd: ["trending"], tg: ["business", "india"], cl: [], v: "none", dd: 3 },
  { t: "The Grand Trunk Road", st: "Two thousand years in twelve chapters", b: "halcyon", c: "books", s: "non-fiction", p: 699, m: 899, r: 4.7, rc: 940, stk: 64, pool: "books", io: 3, bd: ["handpicked"], tg: ["history", "travel"], cl: [], v: "none", dd: 3 },
  { t: "Monsoon Economics", st: "Why the rains still set the budget", b: "halcyon", c: "books", s: "non-fiction", p: 549, m: 749, r: 4.3, rc: 410, stk: 72, pool: "books", io: 5, tg: ["economics", "india"], cl: [], v: "none", dd: 3 },

  // ----------------------------- Stationery ----------------------------
  { t: "Halcyon Dot Grid Notebook", st: "160 GSM, lies flat, 192 pages", b: "halcyon", c: "books", s: "stationery", p: 799, m: 1099, r: 4.6, rc: 3210, stk: 180, pool: "books", io: 2, bd: ["bestseller"], tg: ["notebook", "dot-grid"], cl: ["Ink Black", "Peacock", "Cream"], v: "size", dd: 2 },
  { t: "Studio Vayu Brass Pen", st: "Machined brass, refillable, ages beautifully", b: "studio-vayu", c: "books", s: "stationery", p: 1899, m: 2699, r: 4.5, rc: 620, stk: 74, pool: "books", io: 4, bd: ["handpicked"], tg: ["pen", "brass"], cl: ["Gold"], v: "none", dd: 3 },
  { t: "Halcyon Desk Planner 2027", st: "Undated weekly spreads, tear-off lists", b: "halcyon", c: "books", s: "stationery", p: 999, m: 1399, r: 4.4, rc: 810, stk: 120, pool: "books", io: 0, bd: ["new"], tg: ["planner", "desk"], cl: ["Cream"], v: "none", dd: 2 },

  // ---------------------------- Art & Craft ----------------------------
  { t: "Halcyon Cotton Sketchbook", st: "300 GSM cold-pressed, 24 sheets", b: "halcyon", c: "books", s: "art", p: 1299, m: 1799, r: 4.6, rc: 540, stk: 92, pool: "books", io: 5, tg: ["sketchbook", "watercolour"], cl: [], v: "size", dd: 3 },
  { t: "Studio Vayu Watercolour Set", st: "24 handmade pans in a tin", b: "studio-vayu", c: "books", s: "art", p: 2499, m: 3499, r: 4.5, rc: 310, stk: 48, pool: "books", io: 1, bd: ["handpicked"], tg: ["paint", "handmade"], cl: [], v: "none", dd: 4 },
];

/* --------------------------- Derivation --------------------------- */

const VARIANT_SETS: Record<Exclude<VariantKind, "none">, { name: string; type: VariantGroup["type"]; options: string[] }> = {
  size: { name: "Size", type: "size", options: ["XS", "S", "M", "L", "XL", "XXL"] },
  storage: { name: "Storage", type: "storage", options: ["128 GB", "256 GB", "512 GB", "1 TB"] },
  shoe: { name: "UK Size", type: "size", options: ["6", "7", "8", "9", "10", "11"] },
  ml: { name: "Size", type: "option", options: ["30 ml", "50 ml", "100 ml"] },
  ring: { name: "Ring Size", type: "size", options: ["12", "14", "16", "18", "20"] },
};

function buildVariants(seed: Seed, rand: () => number): VariantGroup[] {
  const groups: VariantGroup[] = [];

  if (seed.cl && seed.cl.length > 1) {
    groups.push({
      id: "color",
      name: "Colour",
      type: "color",
      options: seed.cl.map((label, i) => ({
        id: `color-${slugify(label)}`,
        label,
        value: slugify(label),
        swatch: COLOR_HEX[label] ?? "#cdcdc7",
        inStock: i === 0 || rand() > 0.18,
      })),
    });
  }

  const kind = seed.v ?? "none";
  if (kind !== "none") {
    const set = VARIANT_SETS[kind];
    const step = kind === "storage" ? Math.round(seed.p * 0.16) : 0;
    groups.push({
      id: set.name.toLowerCase().replace(/\s+/g, "-"),
      name: set.name,
      type: set.type,
      options: set.options.map((label, i) => ({
        id: `${set.name}-${slugify(label)}`,
        label,
        value: slugify(label),
        priceDelta: step * i,
        inStock: rand() > 0.16,
      })),
    });
  }

  return groups;
}

function buildBreakdown(rating: number, count: number): RatingBreakdown {
  const five = Math.max(0.35, Math.min(0.82, (rating - 3.2) / 1.6));
  const four = Math.min(0.4, (1 - five) * 0.58);
  const three = (1 - five - four) * 0.5;
  const two = (1 - five - four - three) * 0.55;
  const one = 1 - five - four - three - two;
  const at = (share: number) => Math.max(1, Math.round(count * share));
  return { 5: at(five), 4: at(four), 3: at(three), 2: at(two), 1: at(one) };
}

const SPEC_TEMPLATES: Record<string, (s: Seed) => Specification[]> = {
  electronics: (s) => [
    {
      group: "In the box",
      items: [
        { label: "Contents", value: `${s.t}, USB-C cable, quick start guide, warranty card` },
        { label: "Warranty", value: s.w ?? "1 year manufacturer warranty" },
      ],
    },
    {
      group: "General",
      items: [
        { label: "Brand", value: brandMap.get(s.b)?.name ?? s.b },
        { label: "Model", value: s.t.replace(/\s+/g, "-").toUpperCase() },
        { label: "Country of origin", value: "India" },
        { label: "Manufacturer", value: `${brandMap.get(s.b)?.name} Technologies Pvt Ltd, ${brandMap.get(s.b)?.origin}` },
      ],
    },
  ],
  fashion: (s) => [
    {
      group: "Product details",
      items: [
        { label: "Fabric", value: s.tg?.includes("khadi") ? "Handspun khadi cotton" : "Cotton blend" },
        { label: "Fit", value: "Regular" },
        { label: "Care", value: "Gentle machine wash, do not tumble dry" },
        { label: "Sold by", value: `${brandMap.get(s.b)?.name} Retail LLP` },
      ],
    },
    {
      group: "Sizing",
      items: [
        { label: "Model wears", value: "Size M, height 5 ft 8 in" },
        { label: "Fit advice", value: "True to size — size up for a relaxed fit" },
      ],
    },
  ],
  default: (s) => [
    {
      group: "Product details",
      items: [
        { label: "Brand", value: brandMap.get(s.b)?.name ?? s.b },
        { label: "Material", value: "See description" },
        { label: "Country of origin", value: "India" },
        { label: "Warranty", value: s.w ?? "6 months against manufacturing defects" },
      ],
    },
  ],
};

function buildHighlights(seed: Seed): string[] {
  const brand = brandMap.get(seed.b);
  const base = [
    seed.st,
    `Designed and finished by ${brand?.name} in ${brand?.origin}`,
    seed.dd && seed.dd <= 2 ? "Ships within 24 hours from the nearest hub" : "Ships in 2 working days",
    seed.w ?? "Covered by our 7-day no-questions replacement",
  ];
  if (seed.tg?.length) base.splice(2, 0, `Built for ${seed.tg.slice(0, 3).join(", ")} use`);
  return base;
}

function buildDescription(seed: Seed): string {
  const brand = brandMap.get(seed.b);
  return [
    `${seed.t} is ${brand?.name}'s answer to a simple question: what would this product look like if it were designed for how India actually uses it?`,
    `${seed.st}. Every unit is checked in ${brand?.origin} before it is packed, and the finish you see in the photographs is the finish that arrives at your door.`,
    `We price it at what it costs to make well, plus a margin we can explain. No inflated MRP, no festival-only discounts that quietly return in March.`,
  ].join("\n\n");
}

export const products: Product[] = SEEDS.map((seed, index) => {
  const rand = seeded(seed.t);
  const ids = pickImages(seed.pool, seed.io, 5);
  const specTemplate = SPEC_TEMPLATES[seed.c] ?? SPEC_TEMPLATES.default;

  return {
    id: `p${index + 1}`,
    slug: slugify(seed.t),
    title: seed.t,
    subtitle: seed.st,
    brandSlug: seed.b,
    categorySlug: seed.c,
    subcategorySlug: seed.s,
    images: ids.map((id, i) => ({
      url: img(id, { fit: i === 0 ? "portrait" : "portrait", w: 900 }),
      alt: `${seed.t} — view ${i + 1}`,
    })),
    videoPoster: img(ids[1], { fit: "wide", w: 1200 }),
    price: seed.p,
    mrp: seed.m,
    currency: "INR",
    rating: seed.r,
    reviewCount: seed.rc,
    ratingBreakdown: buildBreakdown(seed.r, seed.rc),
    stock: seed.stk,
    soldCount: Math.round(seed.rc * (2 + rand() * 4)),
    badges: seed.bd ?? [],
    tags: seed.tg ?? [],
    colors: seed.cl ?? [],
    variants: buildVariants(seed, rand),
    highlights: buildHighlights(seed),
    description: buildDescription(seed),
    specifications: [
      ...specTemplate(seed),
      ...(seed.sp
        ? [{ group: "Specifications", items: seed.sp.map(([label, value]) => ({ label, value })) }]
        : []),
    ],
    deliveryDays: seed.dd ?? 3,
    codAvailable: seed.p <= 25000,
    returnWindowDays: seed.c === "beauty" ? 7 : seed.c === "fashion" ? 14 : 10,
    warranty: seed.w ?? (seed.c === "electronics" ? "1 year manufacturer warranty" : "6 months against manufacturing defects"),
    freeShipping: seed.p >= 999,
    createdAt: new Date(2026, 1 + (index % 7), 1 + (index % 27)).toISOString(),
    relatedIds: [],
    bundleIds: [],
  } satisfies Product;
});

/* Cross-sell wiring — same subcategory first, then same category. */
for (const product of products) {
  const rand = seeded(`rel-${product.id}`);
  const sameSub = products.filter(
    (p) => p.id !== product.id && p.subcategorySlug === product.subcategorySlug,
  );
  const sameCat = products.filter(
    (p) =>
      p.id !== product.id &&
      p.categorySlug === product.categorySlug &&
      p.subcategorySlug !== product.subcategorySlug,
  );
  product.relatedIds = [...sameSub, ...sameCat].slice(0, 8).map((p) => p.id);
  product.bundleIds = sameCat
    .slice(0, 6)
    .sort(() => rand() - 0.5)
    .slice(0, 2)
    .map((p) => p.id);
}

export const productMap = new Map(products.map((p) => [p.slug, p]));
export const productById = new Map(products.map((p) => [p.id, p]));
