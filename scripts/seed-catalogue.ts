/**
 * Ten departments and a hundred and twenty listings, to fill the shop out.
 *
 *   npx tsx scripts/seed-catalogue.ts            # add or update
 *   npx tsx scripts/seed-catalogue.ts --remove   # take them all out again
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  READ THIS BEFORE YOU SELL ANYTHING FROM IT
 * ─────────────────────────────────────────────────────────────────────────
 * These are real kinds of product with plausible specifications, and the
 * prices, stock figures, warranty terms and HSN codes are INVENTED. They are
 * a catalogue-shaped thing for the storefront to be judged on, not a
 * catalogue. Before a customer can buy any of it:
 *
 *   - put your own photographs on it (the Upload button on the product form
 *     stores them here and they are optimised; these are stock photographs
 *     served from Unsplash);
 *   - put your own price and your own stock on it;
 *   - check the HSN code and the GST rate against the purchase invoice from
 *     your supplier. The codes below are the usual ones for each kind of
 *     goods and they are still a guess about YOUR goods.
 *
 * It does not touch the Home & Appliance department or the five products that
 * were seeded with it: those are the shop's own stock, with the shop's own
 * photographs, and nothing here should mix into them.
 *
 * Idempotent: every row is upserted on its slug, so running it twice changes
 * nothing. `--remove` deletes exactly what it created — the ten departments
 * below and their products — and nothing else. A product that has ever been
 * ordered is left alone rather than deleted, because an order line points at
 * it and an invoice has to keep resolving.
 *
 * The photographs are Unsplash URLs, and every id below was fetched and
 * checked for a 200 before it was written here. They render because
 * `src/components/ui/image.tsx` hands a remote URL straight to the browser
 * rather than to the image optimiser, which on this server cannot reach the
 * internet. That is also why they are not resized: a remote photo is served
 * at whatever Unsplash returns.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const remove = process.argv.includes("--remove");

/* ------------------------------------------------------------------ *
 *  Photographs
 *
 *  Verified Unsplash ids, grouped by department. `photo()` asks for a
 *  1200px-wide crop, which is the widest the product gallery ever shows.
 * ------------------------------------------------------------------ */

const POOL: Record<string, string[]> = {
  "kitchen-dining": [
    "1556909114-f6e7ad7d3136", "1584990347449-a2d4c2c9ca42", "1590794056226-79ef3a8147e1",
    "1565958011703-44f9829ba187", "1610701596007-11502861dcfa", "1607098665874-fd193397547b",
    "1544787219-7f47ccb76574", "1600585154340-be6161a56a0c", "1594385208974-2e75f8d7bb48",
    "1578916171728-46686eac8d58", "1563822249366-3efb23b8e0c9", "1593618998160-e34014e67546",
  ],
  electronics: [
    "1498049794561-7780e7231661", "1550009158-9ebf69173e03", "1593642632823-8f785ba67e45",
    "1526170375885-4d8ecf77b99f", "1519389950473-47ba0277781c", "1588508065123-287b28e013da",
    "1517336714731-489689fd1ca8", "1496181133206-80ce9b88a853", "1531297484001-80022131f5a1",
    "1588872657578-7efd1f1555ed", "1484788984921-03950022c9ef", "1541807084-5c52b6b3adef",
  ],
  audio: [
    "1505740420928-5e560c06d30e", "1546435770-a3e426bf472b", "1590658268037-6bf12165a8df",
    "1608043152269-423dbba4e7e1", "1484704849700-f032a568e944", "1583394838336-acd977736f90",
    "1558756520-22cfe5d382ca", "1610945415295-d9bbf067e59c", "1545127398-14699f92334b",
    "1593305841991-05c297ba4575", "1524678606370-a47ad25cb82a", "1487215078519-e21cc028cb29",
  ],
  mobiles: [
    "1511707171634-5f897ff02aa9", "1592750475338-74b7b21085ab", "1598327105666-5b89351aff97",
    "1580910051074-3eb694886505", "1510557880182-3d4d3cba35a5", "1556656793-08538906a9f8",
    "1601784551446-20c9e07cdbdb", "1512499617640-c74ae3a79d37", "1585060544812-6b45742d762f",
    "1567581935884-3349723552ca", "1533228100845-08145b01de14", "1546054454-aa26e2b734c7",
  ],
  computers: [
    "1587829741301-dc798b83add3", "1615663245857-ac93bb7c39e7", "1618410320928-25228d811631",
    "1547082299-de196ea013d6", "1593344484962-796055d4a3a4", "1625842268584-8f3296236761",
    "1517336714731-489689fd1ca8", "1496181133206-80ce9b88a853", "1531297484001-80022131f5a1",
    "1588872657578-7efd1f1555ed", "1484788984921-03950022c9ef", "1611186871348-b1ce696e52c9",
  ],
  "home-decor": [
    "1513519245088-0e12902e5a38", "1540932239986-30128078f3c5", "1493663284031-b7e3aefcae8e",
    "1567016432779-094069958ea5", "1524758631624-e2822e304c36", "1586023492125-27b2c045efd7",
    "1505693416388-ac5ce068fe85", "1556228453-efd6c1ff04f6", "1522708323590-d24dbb6b0267",
    "1583847268964-b28dc8f51f92", "1616486338812-3dadae4b4ace", "1594026112284-02bb6f3352fe",
  ],
  furniture: [
    "1555041469-a586c61ea9bc", "1567538096630-e0c55bd6374c", "1540574163026-643ea20ade25",
    "1506439773649-6e0eb8cfb237", "1592078615290-033ee584e267", "1538688525198-9b88f6f53126",
    "1550226891-ef816aed4a98", "1518455027359-f3f8164ba6bd", "1560448204-e02f11c3d0e2",
    "1449247709967-d4461a6a6103", "1580480055273-228ff5388ef8", "1595428774223-ef52624120d2",
  ],
  "personal-care": [
    "1596462502278-27bfdc403348", "1522335789203-aabd1fc54bc9", "1571781926291-c477ebfd024b",
    "1556228720-195a672e8a03", "1570172619644-dfd03ed5d881", "1598440947619-2c35fc9aa908",
    "1512496015851-a90fb38ba796", "1608248543803-ba4f8c70ae0b", "1585232004423-244e0e6904e3",
    "1620916566398-39f1143ab7be", "1631729371254-42c2892f0e6e", "1503236823255-94609f598e71",
  ],
  fitness: [
    "1517836357463-d25dfeac3438", "1571019613454-1cb2f99b2d8b", "1534438327276-14e5300c3a48",
    "1526506118085-60ce8714f8c5", "1584735935682-2f2b69dff9d2", "1599058917765-a780eda07a3e",
    "1591291621164-2c6367723315", "1518611012118-696072aa579a", "1596357395217-80de13130e92",
    "1540497077202-7c8a3999166f", "1594737625785-a6cbdabd333c", "1571902943202-507ec2618e8f",
  ],
  "laundry-cleaning": [
    "1556909212-d5b604d0c90d", "1585659722983-3a675dabf23d", "1574269909862-7e1d70bb8078",
    "1584622650111-993a426fbf0a", "1586208958839-06c17cacdf08", "1595246140625-573b715d11dc",
    "1631679706909-1844bbd07221", "1600585152220-90363fe7e115", "1556911220-bff31c812dba",
    "1616628188540-925618b98319", "1583845112203-29329902332e", "1558618666-fcd25c85cd64",
  ],
};

const photo = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&crop=entropy&w=1200&h=1500&q=80`;

/* ------------------------------------------------------------------ */

type Spec = [group: string, rows: [string, string][]];

interface P {
  /** Title. */ t: string;
  /** Subtitle — one line, the thing that makes it worth opening. */ st: string;
  /** Subcategory slug. */ sub: string;
  /** Selling price, rupees. */ p: number;
  /** MRP, rupees. */ m: number;
  hl: string[];
  sp: Spec[];
  tags?: string[];
  /** Units in stock. */ stk?: number;
  /** Working days to the courier. */ dd?: number;
  w?: string;
}

interface C {
  slug: string;
  name: string;
  menuLabel: string;
  icon: string;
  accent: string;
  description: string;
  /** Usual HSN for this kind of goods. VERIFY against your own invoices. */
  hsn: string;
  tax: number;
  /** Which photograph in the pool fronts the department. */
  face?: number;
  subs: { slug: string; name: string; description: string }[];
  products: P[];
}

const CATEGORIES: C[] = [
  /* ---------------------------------------------------------------- */
  {
    slug: "kitchen-dining",
    face: 4,
    name: "Kitchen & Dining",
    menuLabel: "Kitchen",
    icon: "kettle",
    accent: "#2f5265",
    description:
      "Cookware, dinnerware and the small things that make a kitchen work — chosen for how they hold up after a year, not for how they photograph.",
    hsn: "7323",
    tax: 18,
    subs: [
      { slug: "cookware", name: "Cookware", description: "Pans, kadais and pressure cookers for daily cooking." },
      { slug: "dining", name: "Dining & serveware", description: "Dinner sets, cutlery and serving pieces." },
      { slug: "kitchen-storage", name: "Storage & prep", description: "Containers, boards and the tools around them." },
    ],
    products: [
      { t: "Triply Stainless Steel Kadai, 2.5L", st: "Three layers, so nothing catches on the base", sub: "cookware", p: 2199, m: 3199, stk: 40,
        hl: ["Steel–aluminium–steel base", "Induction and gas", "Riveted steel handles", "Glass lid included"],
        sp: [["Basics", [["Material", "Triply stainless steel"], ["Capacity", "2.5 litres"], ["Base", "4.8 mm"]]], ["In the box", [["Contents", "Kadai, tempered glass lid"]]]], tags: ["cookware", "induction"] },
      { t: "Hard Anodised Tawa, 28cm", st: "Heats flat and stays flat", sub: "cookware", p: 1149, m: 1799, stk: 60,
        hl: ["Hard anodised, scratch resistant", "4 mm thick base", "Stays-cool handle", "Gas and induction"],
        sp: [["Basics", [["Material", "Hard anodised aluminium"], ["Diameter", "28 cm"], ["Thickness", "4 mm"]]], ["Care", [["Cleaning", "Hand wash"]]]], tags: ["cookware", "tawa"] },
      { t: "Cast Iron Skillet, 25cm", st: "Pre-seasoned, and it only gets better", sub: "cookware", p: 1699, m: 2499, stk: 28,
        hl: ["Pre-seasoned cast iron", "Oven safe to 250°C", "Pour spouts both sides", "Works on every hob"],
        sp: [["Basics", [["Material", "Cast iron"], ["Diameter", "25 cm"], ["Weight", "2.4 kg"]]], ["Care", [["Cleaning", "Rinse, dry, oil"]]]], tags: ["cookware", "cast-iron"] },
      { t: "Pressure Cooker 5L, stainless steel", st: "ISI marked, with a gasket you can actually buy again", sub: "cookware", p: 2799, m: 3999, stk: 35,
        hl: ["ISI marked", "Induction base", "Metallic safety plug", "Spares available"],
        sp: [["Basics", [["Capacity", "5 litres"], ["Material", "Stainless steel"], ["Hob", "Gas and induction"]]], ["Safety", [["Certification", "ISI"], ["Release", "Weight valve"]]]], tags: ["cookware", "pressure-cooker"], w: "5 years on the body, 1 year on the gasket" },
      { t: "Copper Bottom Cookware Set, 4 pieces", st: "The set most kitchens actually start with", sub: "cookware", p: 3299, m: 4999, stk: 22,
        hl: ["Copper base spreads heat", "Two pans, two lids", "Stainless interior", "Gas only"],
        sp: [["Basics", [["Pieces", "4"], ["Material", "Stainless steel, copper base"]]], ["In the box", [["Contents", "1.5L and 2.5L pans with lids"]]]], tags: ["cookware", "set"] },
      { t: "Stoneware Dinner Set, 18 pieces", st: "Microwave and dishwasher safe, reactive glaze", sub: "dining", p: 4499, m: 6499, stk: 18,
        hl: ["Six place settings", "Microwave and dishwasher safe", "Reactive glaze, no two alike", "Chip-resistant rim"],
        sp: [["Basics", [["Pieces", "18"], ["Material", "Stoneware"], ["Settings", "6"]]], ["In the box", [["Contents", "6 dinner, 6 quarter, 6 bowls"]]]], tags: ["dining", "ceramic"] },
      { t: "Cutlery Set, 24 pieces", st: "18/10 steel with a satin finish", sub: "dining", p: 1899, m: 2899, stk: 44,
        hl: ["18/10 stainless steel", "Six place settings", "Satin finish, hides marks", "Dishwasher safe"],
        sp: [["Basics", [["Pieces", "24"], ["Grade", "18/10 stainless"], ["Finish", "Satin"]]], ["In the box", [["Contents", "6 each of table spoon, fork, knife, tea spoon"]]]], tags: ["dining", "cutlery"] },
      { t: "Insulated Casserole 2.5L", st: "Rotis still warm two hours later", sub: "dining", p: 1299, m: 1999, stk: 50,
        hl: ["Holds heat about 4 hours", "Steel inner, PU insulation", "Locking lid", "Serves 4 to 6"],
        sp: [["Basics", [["Capacity", "2.5 litres"], ["Inner", "Stainless steel"], ["Retention", "About 4 hours"]]], ["Care", [["Cleaning", "Hand wash the inner"]]]], tags: ["dining", "casserole"] },
      { t: "Borosilicate Storage Set, 5 pieces", st: "Fridge to microwave to table", sub: "kitchen-storage", p: 1699, m: 2599, stk: 46,
        hl: ["Borosilicate glass", "Airtight snap lids", "Microwave and freezer safe", "Stackable"],
        sp: [["Basics", [["Pieces", "5"], ["Material", "Borosilicate glass"], ["Sizes", "300ml to 1.5L"]]], ["Care", [["Dishwasher", "Yes, lids on the top rack"]]]], tags: ["storage", "glass"] },
      { t: "Bamboo Chopping Board Set", st: "Three sizes, and a groove that catches the juice", sub: "kitchen-storage", p: 899, m: 1499, stk: 70,
        hl: ["Three boards", "Juice groove", "Kind to knife edges", "Oiled bamboo"],
        sp: [["Basics", [["Pieces", "3"], ["Material", "Bamboo"], ["Largest", "38 × 28 cm"]]], ["Care", [["Cleaning", "Wipe, dry upright"]]]], tags: ["storage", "bamboo"] },
      { t: "Electric Chopper 400W", st: "Onions in about eight seconds", sub: "kitchen-storage", p: 1499, m: 2299, stk: 38,
        hl: ["400W motor", "Twin stainless blades", "900 ml bowl", "One-touch pulse"],
        sp: [["Basics", [["Power", "400 W"], ["Bowl", "900 ml"], ["Blades", "Stainless steel, twin"]]], ["Safety", [["Lid", "Interlock"]]]], tags: ["kitchen", "appliance"] },
      { t: "Vacuum Flask 1L", st: "Twenty-four hours, and it means it", sub: "kitchen-storage", p: 1399, m: 2199, stk: 55,
        hl: ["24 hours hot, 24 cold", "Double-wall vacuum steel", "Leak-proof stopper", "Fits a car cup holder"],
        sp: [["Basics", [["Capacity", "1 litre"], ["Material", "304 stainless steel"], ["Retention", "24 hours"]]], ["Care", [["Cleaning", "Hand wash"]]]], tags: ["storage", "flask"] },
    ],
  },

  /* ---------------------------------------------------------------- */
  {
    slug: "electronics",
    name: "Electronics",
    menuLabel: "Electronics",
    icon: "cpu",
    accent: "#2f5265",
    description:
      "Televisions, cameras and the small connected things around them. Everything here is stocked and invoiced by us, with the warranty handled here.",
    hsn: "8528",
    tax: 18,
    subs: [
      { slug: "televisions", name: "Televisions", description: "Smart and HD-ready panels for every room." },
      { slug: "smart-home", name: "Smart home", description: "Plugs, bulbs, sensors and the hubs that run them." },
      { slug: "power-cables", name: "Power & cables", description: "Power banks, protectors and the wiring between." },
    ],
    products: [
      { t: "43-inch 4K Smart LED TV", st: "Real 4K, and an interface that is not a maze", sub: "televisions", p: 24999, m: 34999, stk: 14,
        hl: ["3840 × 2160 resolution", "Three HDMI, two USB", "20W box speakers", "Screen mirroring"],
        sp: [["Display", [["Size", "43 inches"], ["Resolution", "3840 × 2160"], ["Refresh", "60 Hz"]]], ["Connections", [["HDMI", "3"], ["USB", "2"], ["Wi-Fi", "Yes"]]]], tags: ["tv", "4k"], dd: 4, w: "1 year on the panel, 1 year on the parts" },
      { t: "32-inch HD Ready Smart TV", st: "The second-room television", sub: "televisions", p: 12499, m: 17999, stk: 20,
        hl: ["1366 × 768 resolution", "Two HDMI", "16W speakers", "Apps built in"],
        sp: [["Display", [["Size", "32 inches"], ["Resolution", "1366 × 768"]]], ["Connections", [["HDMI", "2"], ["USB", "1"]]]], tags: ["tv", "hd"], dd: 4, w: "1 year on the panel" },
      { t: "Streaming Stick 4K", st: "Makes an old television a new one", sub: "televisions", p: 3499, m: 4999, stk: 60,
        hl: ["4K HDR output", "Voice remote", "Dual-band Wi-Fi", "HDMI powered"],
        sp: [["Basics", [["Output", "4K HDR"], ["Wi-Fi", "Dual band"], ["Storage", "8 GB"]]], ["In the box", [["Contents", "Stick, remote, adapter"]]]], tags: ["streaming"] },
      { t: "Android TV Box, 4K", st: "For a screen with nothing clever in it", sub: "televisions", p: 4299, m: 5999, stk: 32,
        hl: ["4K at 60fps", "2GB RAM, 16GB storage", "Ethernet and Wi-Fi", "Bluetooth remote"],
        sp: [["Basics", [["Output", "4K 60fps"], ["RAM", "2 GB"], ["Storage", "16 GB"]]], ["Connections", [["Ethernet", "Yes"], ["Bluetooth", "5.0"]]]], tags: ["streaming"] },
      { t: "Action Camera 4K, waterproof", st: "Ten metres down without a case", sub: "smart-home", p: 6999, m: 9999, stk: 24,
        hl: ["4K at 30fps", "Waterproof to 10 m", "Image stabilisation", "Two batteries included"],
        sp: [["Camera", [["Video", "4K 30fps"], ["Sensor", "20 MP"], ["Stabilisation", "Electronic"]]], ["In the box", [["Contents", "Camera, 2 batteries, mounts"]]]], tags: ["camera"] },
      { t: "Digital Photo Frame, 10 inch", st: "Send pictures to it from anywhere", sub: "smart-home", p: 5499, m: 7999, stk: 26,
        hl: ["10-inch IPS touch screen", "Wi-Fi photo sending", "16 GB storage", "Auto brightness"],
        sp: [["Display", [["Size", "10 inches"], ["Panel", "IPS touch"], ["Resolution", "1280 × 800"]]], ["Storage", [["Built in", "16 GB"], ["Card", "Up to 32 GB"]]]], tags: ["smart-home"] },
      { t: "Wi-Fi Smart Plug, 16A", st: "Runs the geyser on a schedule", sub: "smart-home", p: 899, m: 1499, stk: 90,
        hl: ["16A, for heavy appliances", "Schedules and timers", "Energy monitoring", "Works without a hub"],
        sp: [["Basics", [["Rating", "16 A"], ["Wi-Fi", "2.4 GHz"], ["Monitoring", "Yes"]]], ["Safety", [["Protection", "Overload cut-off"]]]], tags: ["smart-home"] },
      { t: "Smart LED Bulb, 9W colour", st: "Sixteen million of them, and warm white when you have had enough", sub: "smart-home", p: 649, m: 1099, stk: 120,
        hl: ["9W, B22 fitting", "16 million colours", "Warm to cool white", "Voice assistants"],
        sp: [["Basics", [["Power", "9 W"], ["Fitting", "B22"], ["Lumens", "806"]]], ["Control", [["App", "Yes"], ["Voice", "Alexa, Google"]]]], tags: ["smart-home", "lighting"] },
      { t: "Smart Door Sensor", st: "Tells you the door opened, and when", sub: "smart-home", p: 1099, m: 1699, stk: 64,
        hl: ["Opens and closes logged", "Phone alerts", "Two-year battery", "Adhesive fitting"],
        sp: [["Basics", [["Battery", "CR2032, about 2 years"], ["Range", "Up to 30 m"]]], ["Control", [["App", "Yes"]]]], tags: ["smart-home"] },
      { t: "Power Bank 20000mAh, 22.5W", st: "Three full phone charges, and it charges fast itself", sub: "power-cables", p: 1999, m: 2999, stk: 85,
        hl: ["20000 mAh", "22.5W fast output", "USB-C in and out", "Charges three devices"],
        sp: [["Basics", [["Capacity", "20000 mAh"], ["Output", "22.5 W"], ["Ports", "2 USB-A, 1 USB-C"]]], ["Safety", [["Protection", "Over-charge, short circuit"]]]], tags: ["power"] },
      { t: "Wi-Fi Router AC1200, dual band", st: "Covers a 2BHK without a repeater", sub: "power-cables", p: 2299, m: 3499, stk: 40,
        hl: ["Dual band, 1200 Mbps", "Four antennas", "Guest network", "Parental controls"],
        sp: [["Basics", [["Speed", "300 + 867 Mbps"], ["Antennas", "4 × 5 dBi"], ["Ports", "4 LAN, 1 WAN"]]], ["Features", [["Guest network", "Yes"]]]], tags: ["network"] },
      { t: "Surge Protector, 6 socket", st: "The strip you put the television on", sub: "power-cables", p: 949, m: 1499, stk: 100,
        hl: ["Six universal sockets", "Surge and spike protection", "Individual switches", "2.5 m cord"],
        sp: [["Basics", [["Sockets", "6"], ["Cord", "2.5 m"], ["Rating", "10 A"]]], ["Safety", [["Protection", "Surge, overload"]]]], tags: ["power"] },
    ],
  },

  /* ---------------------------------------------------------------- */
  {
    slug: "audio",
    name: "Audio & Headphones",
    menuLabel: "Audio",
    icon: "cpu",
    accent: "#2f5265",
    description:
      "Headphones, speakers and the things that make a room sound better. Battery figures here are the ones the makers publish and we have no reason to doubt.",
    hsn: "8518",
    tax: 18,
    subs: [
      { slug: "headphones", name: "Headphones & earbuds", description: "Over-ear, in-ear and everything between." },
      { slug: "speakers", name: "Speakers", description: "Portable, party and bookshelf." },
      { slug: "home-audio", name: "Home audio", description: "Soundbars, turntables and desk audio." },
    ],
    products: [
      { t: "Over-Ear ANC Headphones, 40 hours", st: "Noise cancelling that survives a flight and the taxi home", sub: "headphones", p: 5999, m: 8999, stk: 30,
        hl: ["Active noise cancelling", "40 hours with ANC on", "Memory foam earcups", "Folds flat"],
        sp: [["Audio", [["Drivers", "40 mm"], ["ANC", "Hybrid"], ["Codec", "SBC, AAC"]]], ["Battery", [["Playback", "40 hours"], ["Charge", "USB-C, 2 hours"]]]], tags: ["headphones", "anc"] },
      { t: "True Wireless Earbuds, 30 hour case", st: "Six hours in the ear, thirty in the pocket", sub: "headphones", p: 2499, m: 3999, stk: 75,
        hl: ["6 hours per charge", "30 hours with the case", "IPX5 splash resistant", "Touch controls"],
        sp: [["Audio", [["Drivers", "10 mm"], ["Bluetooth", "5.3"]]], ["Battery", [["Buds", "6 hours"], ["With case", "30 hours"]]]], tags: ["earbuds", "tws"] },
      { t: "Neckband Earphones, 24 hours", st: "For the commute, and it never falls out", sub: "headphones", p: 1299, m: 1999, stk: 90,
        hl: ["24 hours playback", "Magnetic buds", "Fast charge, 10 min for 4 hours", "IPX4"],
        sp: [["Audio", [["Drivers", "11 mm"], ["Bluetooth", "5.2"]]], ["Battery", [["Playback", "24 hours"]]]], tags: ["earphones"] },
      { t: "Studio Monitor Headphones", st: "Flat, which is the point", sub: "headphones", p: 4499, m: 6499, stk: 20,
        hl: ["Closed back", "Flat response", "3 m coiled cable", "Replaceable earpads"],
        sp: [["Audio", [["Drivers", "45 mm"], ["Impedance", "38 Ω"], ["Response", "15 Hz – 28 kHz"]]], ["Build", [["Cable", "3 m coiled"]]]], tags: ["headphones", "studio"] },
      { t: "Gaming Headset, 7.1 surround", st: "You hear the footsteps before you see them", sub: "headphones", p: 3299, m: 4999, stk: 34,
        hl: ["Virtual 7.1 surround", "Detachable boom mic", "Memory foam", "USB and 3.5 mm"],
        sp: [["Audio", [["Drivers", "50 mm"], ["Surround", "Virtual 7.1"]]], ["Mic", [["Type", "Detachable, noise cancelling"]]]], tags: ["headphones", "gaming"] },
      { t: "Wired Earphones with mic", st: "The pair you keep in the bag", sub: "headphones", p: 599, m: 999, stk: 140,
        hl: ["3.5 mm jack", "In-line mic and control", "Tangle-resistant cable", "Three ear tip sizes"],
        sp: [["Audio", [["Drivers", "10 mm"], ["Connector", "3.5 mm"]]], ["In the box", [["Contents", "Earphones, 3 tip sizes"]]]], tags: ["earphones", "wired"] },
      { t: "Bluetooth Party Speaker 40W", st: "Loud enough for a terrace", sub: "speakers", p: 4999, m: 7499, stk: 22,
        hl: ["40W output", "12 hours playback", "Mic and guitar inputs", "LED ring"],
        sp: [["Audio", [["Output", "40 W"], ["Bluetooth", "5.0"]]], ["Battery", [["Playback", "12 hours"]]]], tags: ["speaker", "party"] },
      { t: "Portable Speaker 10W, IPX7", st: "Survives the shower and the pool edge", sub: "speakers", p: 1999, m: 2999, stk: 68,
        hl: ["10W driver", "IPX7 waterproof", "15 hours playback", "Pairs two for stereo"],
        sp: [["Audio", [["Output", "10 W"], ["Bluetooth", "5.1"]]], ["Build", [["Rating", "IPX7"]]]], tags: ["speaker", "portable"] },
      { t: "Bookshelf Speakers, 50W pair", st: "A real pair of speakers, for a desk or a shelf", sub: "speakers", p: 8999, m: 12999, stk: 12,
        hl: ["50W per pair", "4-inch woofers", "Bluetooth and RCA", "Wooden cabinets"],
        sp: [["Audio", [["Output", "50 W"], ["Woofer", "4 inch"], ["Tweeter", "1 inch silk"]]], ["Connections", [["Inputs", "Bluetooth, RCA, optical"]]]], tags: ["speaker", "bookshelf"], dd: 4 },
      { t: "Soundbar 120W, 2.1 channel", st: "The television finally sounds like the picture looks", sub: "home-audio", p: 7499, m: 10999, stk: 18,
        hl: ["120W with a wired subwoofer", "HDMI ARC and optical", "Three sound modes", "Wall mountable"],
        sp: [["Audio", [["Output", "120 W"], ["Channels", "2.1"]]], ["Connections", [["Inputs", "HDMI ARC, optical, AUX, USB"]]]], tags: ["soundbar"], dd: 4 },
      { t: "Turntable, belt drive", st: "For the records that came out of the loft", sub: "home-audio", p: 11999, m: 16999, stk: 8,
        hl: ["Belt drive, 33 and 45 rpm", "Built-in phono preamp", "USB recording", "Counterweighted arm"],
        sp: [["Basics", [["Drive", "Belt"], ["Speeds", "33⅓, 45"]]], ["Connections", [["Output", "RCA, USB"]]]], tags: ["turntable"], dd: 5 },
      { t: "USB Conference Speakerphone", st: "So the call stops being the worst part of the day", sub: "home-audio", p: 5999, m: 8499, stk: 16,
        hl: ["360° microphone array", "Echo cancellation", "USB-C and Bluetooth", "Covers a 6-person room"],
        sp: [["Audio", [["Mics", "4, 360°"], ["Range", "About 3 m"]]], ["Connections", [["Inputs", "USB-C, Bluetooth"]]]], tags: ["conference"] },
    ],
  },

  /* ---------------------------------------------------------------- */
  {
    slug: "mobiles",
    name: "Mobiles & Accessories",
    menuLabel: "Mobiles",
    icon: "cpu",
    accent: "#2f5265",
    description:
      "Phones and the things they need. Cases, chargers and cables that are rated for what they claim.",
    hsn: "8517",
    tax: 18,
    subs: [
      { slug: "smartphones", name: "Smartphones", description: "Phones we hold in stock, boxed and sealed." },
      { slug: "charging", name: "Charging & cables", description: "Adapters, cables and wireless pads." },
      { slug: "phone-cases", name: "Cases & protection", description: "Covers, glass and mounts." },
    ],
    products: [
      { t: "5G Smartphone, 8GB / 128GB", st: "A big battery and four years of updates", sub: "smartphones", p: 18999, m: 23999, stk: 18,
        hl: ["6.6-inch 120Hz display", "5000 mAh, 33W charging", "50 MP main camera", "8 GB RAM, 128 GB storage"],
        sp: [["Display", [["Size", "6.6 inches"], ["Refresh", "120 Hz"]]], ["Performance", [["RAM", "8 GB"], ["Storage", "128 GB"], ["Battery", "5000 mAh"]]]], tags: ["phone", "5g"], dd: 3, w: "1 year brand warranty" },
      { t: "Smartphone 6GB / 128GB", st: "Everything most people actually use, and nothing else", sub: "smartphones", p: 12999, m: 16999, stk: 24,
        hl: ["6.5-inch display", "5000 mAh battery", "Dual camera", "Expandable storage"],
        sp: [["Display", [["Size", "6.5 inches"], ["Refresh", "90 Hz"]]], ["Performance", [["RAM", "6 GB"], ["Storage", "128 GB"]]]], tags: ["phone"], dd: 3, w: "1 year brand warranty" },
      { t: "Feature Phone, dual SIM", st: "A week on a charge, and the buttons click", sub: "smartphones", p: 1799, m: 2499, stk: 60,
        hl: ["Dual SIM", "About 7 days standby", "Torch and FM radio", "Large keypad"],
        sp: [["Basics", [["Display", "2.4 inches"], ["Battery", "1800 mAh"], ["SIM", "Dual"]]], ["Features", [["Radio", "FM, wireless"]]]], tags: ["phone", "feature"] },
      { t: "Tablet 10-inch, 4GB / 64GB", st: "For the sofa, the recipe and the video call", sub: "smartphones", p: 13999, m: 18999, stk: 15,
        hl: ["10.1-inch display", "7000 mAh battery", "Dual speakers", "Wi-Fi and LTE"],
        sp: [["Display", [["Size", "10.1 inches"], ["Resolution", "1920 × 1200"]]], ["Performance", [["RAM", "4 GB"], ["Storage", "64 GB"]]]], tags: ["tablet"], dd: 3 },
      { t: "65W GaN Charger, 3 port", st: "Charges the laptop and the phone off one socket", sub: "charging", p: 2499, m: 3499, stk: 70,
        hl: ["65W total output", "Two USB-C, one USB-A", "GaN, so it stays small", "Foldable pin"],
        sp: [["Basics", [["Output", "65 W"], ["Ports", "2 USB-C, 1 USB-A"]]], ["Safety", [["Protection", "Over-voltage, thermal"]]]], tags: ["charger", "gan"] },
      { t: "33W Fast Charger with cable", st: "Half a battery in about half an hour", sub: "charging", p: 899, m: 1399, stk: 110,
        hl: ["33W output", "USB-A to USB-C cable included", "Works with most fast-charge phones", "Surge protected"],
        sp: [["Basics", [["Output", "33 W"], ["Cable", "1 m, USB-A to C"]]], ["Safety", [["Protection", "Over-current"]]]], tags: ["charger"] },
      { t: "Braided USB-C Cable, 1.5m", st: "The one that does not fray at the plug", sub: "charging", p: 449, m: 799, stk: 160,
        hl: ["Nylon braided", "60W / 3A rated", "480 Mbps data", "Reinforced collars"],
        sp: [["Basics", [["Length", "1.5 m"], ["Rating", "60 W, 3 A"], ["Data", "480 Mbps"]]], ["Build", [["Jacket", "Nylon braid"]]]], tags: ["cable"] },
      { t: "Wireless Charging Pad, 15W", st: "Put it down and forget about it", sub: "charging", p: 1299, m: 1999, stk: 55,
        hl: ["15W Qi charging", "Case friendly to 5 mm", "Non-slip top", "Foreign object detection"],
        sp: [["Basics", [["Output", "15 W"], ["Standard", "Qi"]]], ["Safety", [["Detection", "Foreign object"]]]], tags: ["charger", "wireless"] },
      { t: "Car Charger 45W, dual port", st: "Enough for two phones on a long drive", sub: "charging", p: 799, m: 1299, stk: 80,
        hl: ["45W total", "USB-C PD and USB-A", "Aluminium body", "12V to 24V"],
        sp: [["Basics", [["Output", "45 W"], ["Ports", "USB-C, USB-A"]]], ["Fit", [["Input", "12–24 V"]]]], tags: ["charger", "car"] },
      { t: "Tempered Glass Screen Guard, 2 pack", st: "9H, and an alignment frame so it goes on straight", sub: "phone-cases", p: 399, m: 799, stk: 200,
        hl: ["9H hardness", "Two in the pack", "Alignment frame included", "Oleophobic coating"],
        sp: [["Basics", [["Hardness", "9H"], ["Thickness", "0.33 mm"], ["Pack", "2"]]], ["In the box", [["Contents", "2 glasses, frame, wipes"]]]], tags: ["protection"] },
      { t: "Shockproof Phone Case", st: "Survives the drop from the kitchen counter", sub: "phone-cases", p: 599, m: 999, stk: 130,
        hl: ["Air-cushion corners", "Raised camera lip", "Wireless charging friendly", "Matte, holds a grip"],
        sp: [["Basics", [["Material", "TPU and polycarbonate"], ["Drop tested", "1.5 m"]]], ["Fit", [["Wireless charging", "Yes"]]]], tags: ["case"] },
      { t: "Car Phone Mount, magnetic", st: "Holds a big phone on a bad road", sub: "phone-cases", p: 699, m: 1199, stk: 90,
        hl: ["Six N52 magnets", "Vent and dashboard fittings", "360° rotation", "Fits phones to 7 inches"],
        sp: [["Basics", [["Mount", "Vent and adhesive"], ["Rotation", "360°"]]], ["Fit", [["Phone size", "Up to 7 inches"]]]], tags: ["mount", "car"] },
    ],
  },

  /* ---------------------------------------------------------------- */
  {
    slug: "computers",
    name: "Computers & Office",
    menuLabel: "Computers",
    icon: "cpu",
    accent: "#2f5265",
    description:
      "Laptops, the things you plug into them, and the desk they sit on. Sensible kit for working from home.",
    hsn: "8471",
    tax: 18,
    subs: [
      { slug: "laptops", name: "Laptops", description: "Machines for study, work and both at once." },
      { slug: "peripherals", name: "Keyboards & mice", description: "What your hands are on all day." },
      { slug: "desk-setup", name: "Desk & storage", description: "Stands, hubs, drives and cables." },
    ],
    products: [
      { t: "14-inch Laptop, 8GB / 512GB SSD", st: "Boots fast, stays quiet, lasts the afternoon", sub: "laptops", p: 42999, m: 52999, stk: 10,
        hl: ["14-inch full HD display", "8 GB RAM, 512 GB SSD", "About 8 hours of use", "Backlit keyboard"],
        sp: [["Display", [["Size", "14 inches"], ["Resolution", "1920 × 1080"]]], ["Performance", [["RAM", "8 GB"], ["Storage", "512 GB SSD"]]]], tags: ["laptop"], dd: 4, w: "1 year brand warranty" },
      { t: "15-inch Laptop, 16GB / 512GB SSD", st: "Enough memory that the browser stops being the problem", sub: "laptops", p: 58999, m: 69999, stk: 8,
        hl: ["15.6-inch full HD", "16 GB RAM, 512 GB SSD", "Fingerprint reader", "Full-size keyboard"],
        sp: [["Display", [["Size", "15.6 inches"], ["Resolution", "1920 × 1080"]]], ["Performance", [["RAM", "16 GB"], ["Storage", "512 GB SSD"]]]], tags: ["laptop"], dd: 4, w: "1 year brand warranty" },
      { t: "Chromebook 11-inch", st: "For a student, and it updates itself", sub: "laptops", p: 18999, m: 24999, stk: 14,
        hl: ["11.6-inch display", "About 10 hours battery", "4 GB RAM, 64 GB storage", "Automatic updates"],
        sp: [["Display", [["Size", "11.6 inches"]]], ["Performance", [["RAM", "4 GB"], ["Storage", "64 GB eMMC"]]]], tags: ["laptop", "chromebook"], dd: 4 },
      { t: "Wireless Keyboard and Mouse Set", st: "One dongle, two devices, no wires", sub: "peripherals", p: 1499, m: 2299, stk: 60,
        hl: ["2.4 GHz, one receiver", "Full size with number pad", "Quiet keys", "Batteries included"],
        sp: [["Basics", [["Connection", "2.4 GHz USB"], ["Layout", "Full size"]]], ["Battery", [["Keyboard", "About 12 months"]]]], tags: ["keyboard", "mouse"] },
      { t: "Mechanical Keyboard, 87 key", st: "Blue switches, and everyone in the room will know", sub: "peripherals", p: 3499, m: 4999, stk: 32,
        hl: ["Blue mechanical switches", "87-key tenkeyless", "White backlight", "Detachable USB-C"],
        sp: [["Basics", [["Switches", "Blue mechanical"], ["Keys", "87"]]], ["Build", [["Cable", "Detachable USB-C"]]]], tags: ["keyboard", "mechanical"] },
      { t: "Wireless Mouse, silent click", st: "Nobody else can hear you working", sub: "peripherals", p: 899, m: 1399, stk: 95,
        hl: ["Silent switches", "1600 DPI, adjustable", "18 months on one battery", "Works on glass"],
        sp: [["Basics", [["DPI", "800 / 1200 / 1600"], ["Connection", "2.4 GHz"]]], ["Battery", [["Life", "About 18 months"]]]], tags: ["mouse"] },
      { t: "1080p Webcam with privacy shutter", st: "You look like a person, not a fax", sub: "peripherals", p: 2199, m: 3299, stk: 40,
        hl: ["1080p at 30fps", "Dual noise-reducing mics", "Physical privacy shutter", "Clips or tripod mounts"],
        sp: [["Camera", [["Video", "1080p 30fps"], ["Field of view", "90°"]]], ["Audio", [["Mics", "2, noise reducing"]]]], tags: ["webcam"] },
      { t: "USB-C Hub, 7 in 1", st: "Gets the ports back that the laptop lost", sub: "desk-setup", p: 2799, m: 3999, stk: 48,
        hl: ["HDMI 4K at 30Hz", "Three USB-A 3.0", "SD and microSD", "100W pass-through charging"],
        sp: [["Ports", [["HDMI", "1, 4K 30Hz"], ["USB-A", "3 × 3.0"], ["Card", "SD, microSD"]]], ["Power", [["Pass-through", "100 W"]]]], tags: ["hub", "usb-c"] },
      { t: "Laptop Stand, aluminium", st: "Puts the screen where your neck wants it", sub: "desk-setup", p: 1799, m: 2699, stk: 55,
        hl: ["Six height positions", "Aluminium, holds 10 kg", "Open back for airflow", "Folds flat"],
        sp: [["Basics", [["Material", "Aluminium"], ["Fits", "11 to 17 inches"], ["Load", "10 kg"]]], ["Build", [["Folds", "Yes"]]]], tags: ["stand"] },
      { t: "Portable SSD 1TB, USB-C", st: "A terabyte that fits in a shirt pocket", sub: "desk-setup", p: 7999, m: 10999, stk: 26,
        hl: ["1 TB capacity", "Up to 1050 MB/s read", "USB-C, cable included", "Shock resistant"],
        sp: [["Basics", [["Capacity", "1 TB"], ["Interface", "USB 3.2 Gen 2"], ["Read", "Up to 1050 MB/s"]]], ["Build", [["Drop", "2 m rated"]]]], tags: ["ssd", "storage"] },
      { t: "External Hard Drive 2TB", st: "The cheap terabytes, for the things you keep", sub: "desk-setup", p: 5299, m: 7499, stk: 34,
        hl: ["2 TB capacity", "USB 3.0", "No power adapter needed", "Backup software included"],
        sp: [["Basics", [["Capacity", "2 TB"], ["Interface", "USB 3.0"]]], ["Power", [["Supply", "Bus powered"]]]], tags: ["hdd", "storage"] },
      { t: "Monitor 24-inch, 75Hz IPS", st: "A second screen, and the colours match the first", sub: "desk-setup", p: 9999, m: 13999, stk: 16,
        hl: ["24-inch IPS, full HD", "75 Hz, flicker free", "HDMI and VGA", "VESA mountable"],
        sp: [["Display", [["Size", "24 inches"], ["Panel", "IPS"], ["Refresh", "75 Hz"]]], ["Connections", [["Inputs", "HDMI, VGA"]]]], tags: ["monitor"], dd: 4 },
    ],
  },

  /* ---------------------------------------------------------------- */
  {
    slug: "home-decor",
    name: "Home Decor",
    menuLabel: "Decor",
    icon: "home",
    accent: "#2f5265",
    description:
      "Lighting, wall pieces and soft furnishing. The things that make a set of rooms feel like somebody lives there.",
    hsn: "9405",
    tax: 18,
    subs: [
      { slug: "lighting", name: "Lighting", description: "Lamps, strings and shades." },
      { slug: "wall-decor", name: "Wall & art", description: "Frames, prints, mirrors and clocks." },
      { slug: "soft-furnishing", name: "Soft furnishing", description: "Cushions, throws and rugs." },
    ],
    products: [
      { t: "Ceramic Table Lamp with shade", st: "Warm light for the side of a bed", sub: "lighting", p: 2299, m: 3499, stk: 30,
        hl: ["Glazed ceramic base", "Fabric drum shade", "E27 fitting", "1.8 m cord with switch"],
        sp: [["Basics", [["Height", "42 cm"], ["Fitting", "E27"], ["Shade", "Cotton blend"]]], ["In the box", [["Contents", "Lamp, shade"]]]], tags: ["lighting", "lamp"] },
      { t: "Arc Floor Lamp, metal", st: "Reaches over the sofa so the light lands on the book", sub: "lighting", p: 5499, m: 7999, stk: 14,
        hl: ["Reaches 1.1 m over", "Weighted marble base", "Foot switch", "E27 fitting"],
        sp: [["Basics", [["Height", "1.8 m"], ["Reach", "1.1 m"], ["Base", "Marble"]]], ["Power", [["Fitting", "E27"]]]], tags: ["lighting", "floor-lamp"], dd: 5 },
      { t: "Warm White String Lights, 10m", st: "For a balcony, and rated for one", sub: "lighting", p: 899, m: 1499, stk: 100,
        hl: ["10 m, 100 LEDs", "Outdoor rated IP44", "Eight modes", "Copper wire, bends where you want"],
        sp: [["Basics", [["Length", "10 m"], ["LEDs", "100"], ["Rating", "IP44"]]], ["Power", [["Supply", "Plug adapter"]]]], tags: ["lighting", "string"] },
      { t: "Paper Pendant Shade, 45cm", st: "Softens a bare bulb for very little", sub: "lighting", p: 749, m: 1199, stk: 75,
        hl: ["45 cm diameter", "Rice paper over a wire frame", "Collapses flat", "Fits a standard ceiling rose"],
        sp: [["Basics", [["Diameter", "45 cm"], ["Material", "Rice paper"]]], ["Fit", [["Rose", "Standard"]]]], tags: ["lighting", "shade"] },
      { t: "Gallery Photo Frame Set, 7 pieces", st: "A wall of pictures, with the spacing worked out", sub: "wall-decor", p: 1999, m: 2999, stk: 42,
        hl: ["Seven frames, mixed sizes", "Layout template included", "Real glass fronts", "Hangs portrait or landscape"],
        sp: [["Basics", [["Pieces", "7"], ["Sizes", "4×6 to 8×10 inches"], ["Front", "Glass"]]], ["In the box", [["Contents", "7 frames, template, hooks"]]]], tags: ["frames", "wall"] },
      { t: "Round Wall Mirror, 60cm", st: "Makes a small hallway twice the size", sub: "wall-decor", p: 3299, m: 4799, stk: 20,
        hl: ["60 cm diameter", "Metal frame", "5 mm mirror glass", "Hanging bracket fitted"],
        sp: [["Basics", [["Diameter", "60 cm"], ["Frame", "Powder-coated metal"], ["Glass", "5 mm"]]], ["Fitting", [["Mount", "Bracket, fitted"]]]], tags: ["mirror", "wall"], dd: 5 },
      { t: "Silent Wall Clock, 30cm", st: "No tick, which you notice at 2am", sub: "wall-decor", p: 1099, m: 1699, stk: 60,
        hl: ["Sweep movement, silent", "30 cm face", "Glass front", "One AA battery"],
        sp: [["Basics", [["Diameter", "30 cm"], ["Movement", "Silent sweep"]]], ["Power", [["Battery", "1 × AA"]]]], tags: ["clock", "wall"] },
      { t: "Framed Botanical Print, A2", st: "One picture that finishes a wall", sub: "wall-decor", p: 1799, m: 2699, stk: 36,
        hl: ["A2, framed and mounted", "Giclée print on matte paper", "Wooden frame", "Ready to hang"],
        sp: [["Basics", [["Size", "A2 (42 × 59 cm)"], ["Print", "Giclée"], ["Frame", "Wood"]]], ["Fitting", [["Hanging", "Wire, fitted"]]]], tags: ["art", "wall"] },
      { t: "Cotton Cushion Covers, set of 4", st: "Changes a sofa for the price of a takeaway", sub: "soft-furnishing", p: 1299, m: 1999, stk: 80,
        hl: ["Four covers, 40 × 40 cm", "Cotton, hidden zip", "Machine washable", "Fillers not included"],
        sp: [["Basics", [["Pieces", "4"], ["Size", "40 × 40 cm"], ["Material", "Cotton"]]], ["Care", [["Washing", "Machine, cold"]]]], tags: ["cushions", "soft"] },
      { t: "Cotton Throw Blanket", st: "For the arm of the sofa, and for February", sub: "soft-furnishing", p: 1699, m: 2499, stk: 50,
        hl: ["130 × 170 cm", "Handloom cotton", "Tasselled edge", "Gets softer with washing"],
        sp: [["Basics", [["Size", "130 × 170 cm"], ["Material", "Cotton"]]], ["Care", [["Washing", "Machine, gentle"]]]], tags: ["throw", "soft"] },
      { t: "Flat-weave Cotton Rug, 4x6ft", st: "Reversible, so it lasts twice as long", sub: "soft-furnishing", p: 3499, m: 4999, stk: 24,
        hl: ["4 × 6 feet", "Reversible flat weave", "Handwoven cotton", "Machine washable"],
        sp: [["Basics", [["Size", "4 × 6 feet"], ["Material", "Cotton"], ["Weave", "Flat, reversible"]]], ["Care", [["Washing", "Machine, cold"]]]], tags: ["rug", "soft"], dd: 5 },
      { t: "Blackout Curtains, pair", st: "The room stays dark until you say so", sub: "soft-furnishing", p: 2299, m: 3499, stk: 38,
        hl: ["Blocks about 90% of light", "Two panels, 7 feet", "Eyelet top", "Cuts some noise too"],
        sp: [["Basics", [["Panels", "2"], ["Size", "4 × 7 feet each"], ["Blackout", "About 90%"]]], ["Care", [["Washing", "Machine, cold"]]]], tags: ["curtains", "soft"] },
    ],
  },

  /* ---------------------------------------------------------------- */
  {
    slug: "furniture",
    name: "Furniture",
    menuLabel: "Furniture",
    icon: "sofa",
    accent: "#2f5265",
    description:
      "Seating, tables and storage that arrives flat and goes together with the tool in the box. Delivery on these takes a little longer, and we say so before you pay.",
    hsn: "9403",
    tax: 18,
    subs: [
      { slug: "seating", name: "Seating", description: "Chairs, stools and small sofas." },
      { slug: "tables", name: "Tables & desks", description: "Coffee, side, dining and work." },
      { slug: "storage-furniture", name: "Storage", description: "Shelving, racks and cabinets." },
    ],
    products: [
      { t: "Ergonomic Office Chair, mesh back", st: "Eight hours in it without noticing it", sub: "seating", p: 8999, m: 13999, stk: 14,
        hl: ["Breathable mesh back", "Adjustable lumbar support", "Height and tilt lock", "Holds 110 kg"],
        sp: [["Basics", [["Back", "Mesh"], ["Load", "110 kg"], ["Adjust", "Height, tilt, armrest"]]], ["Assembly", [["Time", "About 20 minutes"]]]], tags: ["chair", "office"], dd: 6, w: "1 year on the mechanism" },
      { t: "Accent Chair, fabric", st: "The chair in the corner that people fight over", sub: "seating", p: 11999, m: 16999, stk: 9,
        hl: ["Solid wood legs", "High-density foam", "Removable seat cover", "Holds 120 kg"],
        sp: [["Basics", [["Frame", "Solid wood"], ["Upholstery", "Polyester blend"], ["Load", "120 kg"]]], ["Assembly", [["Legs", "Screw on"]]]], tags: ["chair", "accent"], dd: 7 },
      { t: "Bar Stool, set of 2", st: "The right height for a kitchen counter", sub: "seating", p: 6499, m: 9499, stk: 16,
        hl: ["Two stools", "Seat at 65 cm", "Footrest", "Non-marking feet"],
        sp: [["Basics", [["Pieces", "2"], ["Seat height", "65 cm"], ["Load", "100 kg each"]]], ["Assembly", [["Time", "About 15 minutes each"]]]], tags: ["stool"], dd: 6 },
      { t: "Two-Seater Fabric Sofa", st: "Fits up a staircase, which most do not", sub: "seating", p: 24999, m: 34999, stk: 6,
        hl: ["Seats two comfortably", "Solid wood frame", "High-resilience foam", "Legs unscrew for the stairs"],
        sp: [["Basics", [["Size", "150 × 80 × 85 cm"], ["Frame", "Solid wood"], ["Load", "200 kg"]]], ["Assembly", [["Legs", "Screw on"]]]], tags: ["sofa"], dd: 8, w: "1 year on the frame" },
      { t: "Coffee Table, engineered wood", st: "A shelf underneath, for everything that lives there", sub: "tables", p: 5999, m: 8999, stk: 20,
        hl: ["Lower storage shelf", "Scratch-resistant top", "Metal legs", "Holds 50 kg"],
        sp: [["Basics", [["Size", "110 × 60 × 45 cm"], ["Top", "Engineered wood"], ["Load", "50 kg"]]], ["Assembly", [["Time", "About 25 minutes"]]]], tags: ["table", "coffee"], dd: 6 },
      { t: "Nesting Side Tables, set of 2", st: "Two when you need them, one when you do not", sub: "tables", p: 3999, m: 5999, stk: 28,
        hl: ["Two tables, nest together", "Round tops", "Powder-coated frames", "No tools to separate"],
        sp: [["Basics", [["Pieces", "2"], ["Heights", "50 cm and 42 cm"]]], ["Assembly", [["Time", "About 10 minutes"]]]], tags: ["table", "side"], dd: 6 },
      { t: "Writing Desk, 120cm", st: "Deep enough for a laptop and a notebook", sub: "tables", p: 7499, m: 10999, stk: 18,
        hl: ["120 × 60 cm top", "Cable cut-out", "One drawer", "Holds 60 kg"],
        sp: [["Basics", [["Size", "120 × 60 × 75 cm"], ["Drawer", "1"], ["Load", "60 kg"]]], ["Assembly", [["Time", "About 30 minutes"]]]], tags: ["desk"], dd: 6 },
      { t: "Four-Seater Dining Table", st: "Square, so nobody gets the corner", sub: "tables", p: 15999, m: 22999, stk: 8,
        hl: ["Seats four", "Solid rubberwood legs", "Heat-resistant top", "Chairs sold separately"],
        sp: [["Basics", [["Size", "120 × 75 × 75 cm"], ["Seats", "4"]]], ["Assembly", [["Time", "About 40 minutes"]]]], tags: ["table", "dining"], dd: 8 },
      { t: "Five-Tier Bookshelf", st: "Tall, narrow, and it takes the wall anchor seriously", sub: "storage-furniture", p: 6999, m: 9999, stk: 22,
        hl: ["Five shelves", "Anti-tip anchor included", "25 kg per shelf", "Open back"],
        sp: [["Basics", [["Size", "60 × 30 × 180 cm"], ["Shelves", "5"], ["Load", "25 kg per shelf"]]], ["Safety", [["Anchor", "Included"]]]], tags: ["shelf", "storage"], dd: 6 },
      { t: "Shoe Rack, 3 tier", st: "Keeps the hallway from becoming a pile", sub: "storage-furniture", p: 2499, m: 3799, stk: 45,
        hl: ["Holds 12 to 15 pairs", "Ventilated shelves", "Metal and wood", "Assembles in 15 minutes"],
        sp: [["Basics", [["Tiers", "3"], ["Capacity", "12–15 pairs"], ["Size", "70 × 30 × 55 cm"]]], ["Assembly", [["Time", "About 15 minutes"]]]], tags: ["rack", "storage"], dd: 5 },
      { t: "Two-Door Storage Cabinet", st: "Shuts, which is the whole point", sub: "storage-furniture", p: 9499, m: 13999, stk: 12,
        hl: ["Two doors, one internal shelf", "Adjustable shelf height", "Soft-close hinges", "Anti-tip anchor"],
        sp: [["Basics", [["Size", "80 × 40 × 90 cm"], ["Doors", "2"], ["Shelves", "1 adjustable"]]], ["Safety", [["Anchor", "Included"]]]], tags: ["cabinet", "storage"], dd: 7 },
      { t: "Foldable Storage Trunk", st: "Folds flat when it is empty", sub: "storage-furniture", p: 1899, m: 2899, stk: 50,
        hl: ["Folds flat", "Reinforced base", "Lid doubles as a seat", "80 litres"],
        sp: [["Basics", [["Capacity", "80 litres"], ["Size", "75 × 40 × 40 cm"], ["Load", "80 kg on the lid"]]], ["Care", [["Cleaning", "Wipe clean"]]]], tags: ["storage", "trunk"], dd: 5 },
    ],
  },

  /* ---------------------------------------------------------------- */
  {
    slug: "personal-care",
    name: "Personal Care",
    menuLabel: "Personal Care",
    icon: "sparkles",
    accent: "#2f5265",
    description:
      "Grooming and everyday care. Nothing here claims to cure anything — they are tools and toiletries, described as such.",
    hsn: "8510",
    tax: 18,
    subs: [
      { slug: "grooming", name: "Grooming", description: "Trimmers, shavers and dryers." },
      { slug: "skin-hair", name: "Skin & hair", description: "Daily care, plainly labelled." },
      { slug: "wellness", name: "Wellness", description: "Scales, massagers and the quiet things." },
    ],
    products: [
      { t: "Beard Trimmer, 40 settings", st: "Ninety minutes of trim on a two-hour charge", sub: "grooming", p: 1599, m: 2499, stk: 70,
        hl: ["40 length settings, 0.5 to 20 mm", "90 minutes cordless", "Self-sharpening steel blades", "Washable head"],
        sp: [["Basics", [["Settings", "40"], ["Range", "0.5–20 mm"], ["Runtime", "90 minutes"]]], ["Care", [["Head", "Washable"]]]], tags: ["trimmer"], w: "2 years" },
      { t: "Hair Dryer 1800W, ionic", st: "Dries fast without cooking the ends", sub: "grooming", p: 1899, m: 2899, stk: 55,
        hl: ["1800W", "Ionic conditioning", "Cool shot", "Two speeds, three heats"],
        sp: [["Basics", [["Power", "1800 W"], ["Speeds", "2"], ["Heat", "3 settings"]]], ["In the box", [["Contents", "Dryer, concentrator nozzle"]]]], tags: ["dryer"], w: "2 years" },
      { t: "Electric Shaver, wet and dry", st: "Works in the shower, which saves ten minutes", sub: "grooming", p: 3299, m: 4799, stk: 40,
        hl: ["Wet and dry use", "Three flexing heads", "60 minutes runtime", "Pop-up trimmer"],
        sp: [["Basics", [["Heads", "3, flexing"], ["Runtime", "60 minutes"], ["Waterproof", "Fully washable"]]], ["Charge", [["Time", "1 hour"]]]], tags: ["shaver"], w: "2 years" },
      { t: "Hair Straightener, ceramic", st: "Heats in thirty seconds and holds the temperature", sub: "grooming", p: 1499, m: 2299, stk: 60,
        hl: ["Ceramic-coated plates", "Heats in 30 seconds", "Five temperature settings", "Auto shut-off"],
        sp: [["Basics", [["Plates", "Ceramic coated"], ["Heat-up", "30 seconds"], ["Max temp", "220°C"]]], ["Safety", [["Shut-off", "60 minutes"]]]], tags: ["straightener"], w: "2 years" },
      { t: "Nose and Ear Trimmer", st: "Two minutes that nobody talks about", sub: "grooming", p: 799, m: 1299, stk: 90,
        hl: ["Dual-edge steel blade", "Fully washable", "One AA battery", "Cannot nick the skin"],
        sp: [["Basics", [["Blade", "Stainless steel"], ["Power", "1 × AA"]]], ["Care", [["Head", "Washable"]]]], tags: ["trimmer"] },
      { t: "Grooming Kit, 8 in 1", st: "One charge, and everything in one case", sub: "grooming", p: 2799, m: 3999, stk: 35,
        hl: ["Eight attachments", "Beard, body, nose and ear", "120 minutes runtime", "Travel case included"],
        sp: [["Basics", [["Attachments", "8"], ["Runtime", "120 minutes"]]], ["In the box", [["Contents", "Trimmer, 8 heads, case"]]]], tags: ["grooming", "kit"], w: "2 years" },
      { t: "Facial Cleanser, 150ml", st: "Fragrance free, and it says what is in it", sub: "skin-hair", p: 449, m: 699, stk: 120,
        hl: ["Fragrance free", "Soap free, pH balanced", "For daily use", "Full ingredient list on the pack"],
        sp: [["Basics", [["Volume", "150 ml"], ["Fragrance", "None"], ["Skin type", "All"]]], ["Use", [["Frequency", "Twice daily"]]]], tags: ["skincare"], w: "Not applicable" },
      { t: "Moisturiser with SPF 30, 100ml", st: "One step instead of two in the morning", sub: "skin-hair", p: 699, m: 999, stk: 100,
        hl: ["SPF 30, broad spectrum", "Non-greasy", "Fragrance free", "Sits under makeup"],
        sp: [["Basics", [["Volume", "100 ml"], ["SPF", "30"], ["Fragrance", "None"]]], ["Use", [["Frequency", "Every morning"]]]], tags: ["skincare"], w: "Not applicable" },
      { t: "Hair Oil, 200ml", st: "Cold pressed, and it does not smell of a salon", sub: "skin-hair", p: 399, m: 599, stk: 130,
        hl: ["Cold-pressed oils", "No mineral oil", "Light, washes out", "Glass bottle"],
        sp: [["Basics", [["Volume", "200 ml"], ["Base", "Coconut and almond"]]], ["Use", [["Frequency", "Twice a week"]]]], tags: ["haircare"], w: "Not applicable" },
      { t: "Digital Bathroom Scale", st: "Reads the same three times in a row", sub: "wellness", p: 1199, m: 1899, stk: 65,
        hl: ["Tempered glass, 180 kg", "100 g steps", "Auto on and off", "Batteries included"],
        sp: [["Basics", [["Capacity", "180 kg"], ["Graduation", "100 g"], ["Surface", "Tempered glass"]]], ["Power", [["Battery", "2 × AAA"]]]], tags: ["scale"], w: "1 year" },
      { t: "Handheld Massager", st: "For a back that has been at a desk all week", sub: "wellness", p: 2299, m: 3499, stk: 32,
        hl: ["Five speeds", "Four heads", "Cordless, 3 hours", "Auto stop at 15 minutes"],
        sp: [["Basics", [["Speeds", "5"], ["Heads", "4"], ["Runtime", "About 3 hours"]]], ["Safety", [["Auto stop", "15 minutes"]]]], tags: ["massager"], w: "1 year" },
      { t: "Electric Toothbrush with 2 heads", st: "Two minutes, and it tells you when", sub: "wellness", p: 1799, m: 2699, stk: 58,
        hl: ["Sonic, 31000 strokes a minute", "Two-minute timer", "30 days per charge", "Two heads in the box"],
        sp: [["Basics", [["Type", "Sonic"], ["Battery", "About 30 days"], ["Modes", "3"]]], ["In the box", [["Contents", "Handle, 2 heads, charger"]]]], tags: ["toothbrush"], w: "1 year" },
    ],
  },

  /* ---------------------------------------------------------------- */
  {
    slug: "fitness",
    name: "Fitness & Outdoors",
    menuLabel: "Fitness",
    icon: "dumbbell",
    accent: "#2f5265",
    description:
      "Kit for training at home and for getting out of the house. Weights are the actual weights, and the mats are the actual thickness.",
    hsn: "9506",
    tax: 18,
    subs: [
      { slug: "home-gym", name: "Home gym", description: "Weights, mats and resistance." },
      { slug: "cardio", name: "Cardio & recovery", description: "Ropes, rollers and the things after." },
      { slug: "outdoor", name: "Outdoor", description: "Bottles, bags and what goes in them." },
    ],
    products: [
      { t: "Adjustable Dumbbell Set, 20kg", st: "One pair instead of a rack of them", sub: "home-gym", p: 4999, m: 7499, stk: 26,
        hl: ["20 kg total, adjustable", "Cast iron plates", "Knurled steel handles", "Spin-lock collars"],
        sp: [["Basics", [["Total", "20 kg"], ["Plates", "Cast iron"], ["Handles", "Knurled steel"]]], ["In the box", [["Contents", "2 handles, plates, 4 collars"]]]], tags: ["weights"], dd: 4 },
      { t: "Cast Iron Kettlebell, 12kg", st: "One weight that does most of a workout", sub: "home-gym", p: 2299, m: 3499, stk: 34,
        hl: ["12 kg, single cast", "Wide flat handle", "Vinyl coated, floor safe", "Flat base, stands up"],
        sp: [["Basics", [["Weight", "12 kg"], ["Material", "Cast iron, vinyl coated"]]], ["Build", [["Base", "Flat"]]]], tags: ["kettlebell"], dd: 4 },
      { t: "Yoga Mat, 6mm TPE", st: "Thick enough for knees on a hard floor", sub: "home-gym", p: 1299, m: 1999, stk: 80,
        hl: ["6 mm TPE", "Non-slip both sides", "Alignment lines", "Carry strap included"],
        sp: [["Basics", [["Thickness", "6 mm"], ["Size", "183 × 61 cm"], ["Material", "TPE"]]], ["In the box", [["Contents", "Mat, strap"]]]], tags: ["yoga", "mat"] },
      { t: "Resistance Band Set, 5 bands", st: "Five strengths, from very easy to not", sub: "home-gym", p: 899, m: 1499, stk: 110,
        hl: ["Five resistance levels", "Natural latex", "Door anchor and handles", "Mesh carry bag"],
        sp: [["Basics", [["Bands", "5"], ["Range", "5 to 25 kg"], ["Material", "Latex"]]], ["In the box", [["Contents", "5 bands, handles, anchor, bag"]]]], tags: ["bands"] },
      { t: "Pull-Up Bar, doorway", st: "Fits without a single screw in the frame", sub: "home-gym", p: 1999, m: 2999, stk: 40,
        hl: ["Fits doorways 70–90 cm", "Holds 100 kg", "No screws or drilling", "Foam grips"],
        sp: [["Basics", [["Fits", "70–90 cm"], ["Load", "100 kg"]]], ["Fitting", [["Drilling", "None"]]]], tags: ["pull-up"] },
      { t: "Ab Roller Wheel with mat", st: "Simple, and harder than it looks", sub: "home-gym", p: 799, m: 1299, stk: 90,
        hl: ["Wide dual wheel", "Knee mat included", "Non-slip grips", "Holds 150 kg"],
        sp: [["Basics", [["Wheel", "Dual, 18 cm"], ["Load", "150 kg"]]], ["In the box", [["Contents", "Roller, knee mat"]]]], tags: ["core"] },
      { t: "Skipping Rope, adjustable", st: "Bearings, so it does not stall halfway", sub: "cardio", p: 549, m: 899, stk: 130,
        hl: ["Ball-bearing swivel", "Adjustable to 3 m", "Weighted handles", "Steel cable in PVC"],
        sp: [["Basics", [["Length", "Up to 3 m"], ["Cable", "Steel core"]]], ["Build", [["Handles", "Weighted"]]]], tags: ["cardio", "rope"] },
      { t: "Foam Roller, 45cm", st: "For the day after the workout", sub: "cardio", p: 1099, m: 1699, stk: 60,
        hl: ["45 cm, medium density", "Textured surface", "Holds 120 kg", "EVA foam"],
        sp: [["Basics", [["Length", "45 cm"], ["Density", "Medium"], ["Load", "120 kg"]]], ["Care", [["Cleaning", "Wipe clean"]]]], tags: ["recovery"] },
      { t: "Massage Gun, 4 heads", st: "Percussion, and quiet enough for a flat", sub: "cardio", p: 4499, m: 6999, stk: 24,
        hl: ["Six speeds", "Four heads", "Under 45 dB", "Six hours per charge"],
        sp: [["Basics", [["Speeds", "6"], ["Heads", "4"], ["Noise", "Under 45 dB"]]], ["Battery", [["Runtime", "About 6 hours"]]]], tags: ["recovery"], w: "1 year" },
      { t: "Insulated Steel Water Bottle, 1L", st: "Cold at the end of a hot day out", sub: "outdoor", p: 1199, m: 1899, stk: 95,
        hl: ["24 hours cold, 12 hot", "Double-wall 304 steel", "Leak-proof lid", "Fits a bottle cage"],
        sp: [["Basics", [["Capacity", "1 litre"], ["Material", "304 stainless"], ["Retention", "24 hours cold"]]], ["Care", [["Cleaning", "Hand wash"]]]], tags: ["bottle", "outdoor"] },
      { t: "Daypack 25L, water resistant", st: "Holds a laptop and a day's worth of things", sub: "outdoor", p: 2299, m: 3499, stk: 48,
        hl: ["25 litres", "Padded 15-inch laptop sleeve", "Water-resistant fabric", "Breathable back panel"],
        sp: [["Basics", [["Capacity", "25 litres"], ["Laptop", "Up to 15 inches"], ["Fabric", "600D polyester"]]], ["Build", [["Rating", "Water resistant"]]]], tags: ["backpack", "outdoor"] },
      { t: "Trekking Poles, pair", st: "Takes the load off the knees going down", sub: "outdoor", p: 2799, m: 3999, stk: 30,
        hl: ["Aluminium, three sections", "65 to 135 cm", "Cork grips", "Tips and baskets included"],
        sp: [["Basics", [["Material", "7075 aluminium"], ["Length", "65–135 cm"], ["Weight", "260 g each"]]], ["In the box", [["Contents", "2 poles, tips, baskets"]]]], tags: ["trekking", "outdoor"] },
    ],
  },

  /* ---------------------------------------------------------------- */
  {
    slug: "laundry-cleaning",
    name: "Laundry & Cleaning",
    menuLabel: "Laundry",
    icon: "spray",
    accent: "#2f5265",
    description:
      "The unglamorous half of a house, done properly. Machines, racks and the things that keep a floor clean.",
    hsn: "8509",
    tax: 18,
    subs: [
      { slug: "laundry", name: "Laundry", description: "Machines, racks, irons and bags." },
      { slug: "floor-care", name: "Floor care", description: "Vacuums, mops and brooms." },
      { slug: "household", name: "Household", description: "Bins, organisers and the rest." },
    ],
    products: [
      { t: "Semi-Automatic Washing Machine 7kg", st: "Two tubs, and it outlives the fully automatic", sub: "laundry", p: 11999, m: 16999, stk: 12,
        hl: ["7 kg wash, 5 kg spin", "Separate wash and spin tubs", "Rust-proof body", "Uses less water"],
        sp: [["Basics", [["Wash capacity", "7 kg"], ["Spin capacity", "5 kg"], ["Type", "Semi-automatic"]]], ["Power", [["Supply", "230 V"]]]], tags: ["washing-machine"], dd: 5, w: "2 years on the product, 5 on the motor" },
      { t: "Cloth Drying Rack, foldable", st: "Takes a full load and folds behind a door", sub: "laundry", p: 2299, m: 3499, stk: 40,
        hl: ["About 18 m of drying line", "Folds to 8 cm", "Powder-coated steel", "Side wings for long items"],
        sp: [["Basics", [["Line", "About 18 m"], ["Folded", "8 cm deep"], ["Material", "Powder-coated steel"]]], ["Load", [["Capacity", "15 kg"]]]], tags: ["drying"], dd: 4 },
      { t: "Steam Iron 2000W, non-stick", st: "Steam burst for the collar that will not sit down", sub: "laundry", p: 1699, m: 2599, stk: 55,
        hl: ["2000W", "Steam burst and spray", "Non-stick soleplate", "Anti-drip"],
        sp: [["Basics", [["Power", "2000 W"], ["Soleplate", "Non-stick"], ["Tank", "250 ml"]]], ["Safety", [["Anti-drip", "Yes"]]]], tags: ["iron"], w: "2 years" },
      { t: "Laundry Basket with lid, 60L", st: "Breathes, so nothing goes sour in it", sub: "laundry", p: 1099, m: 1699, stk: 70,
        hl: ["60 litres", "Ventilated weave", "Lid and handles", "Folds flat"],
        sp: [["Basics", [["Capacity", "60 litres"], ["Material", "Polypropylene weave"]]], ["Care", [["Cleaning", "Wipe clean"]]]], tags: ["laundry", "basket"] },
      { t: "Vacuum Cleaner 1400W, wet and dry", st: "Takes the spill as well as the dust", sub: "floor-care", p: 5999, m: 8999, stk: 22,
        hl: ["1400W motor", "Wet and dry", "15 litre drum", "Blower function"],
        sp: [["Basics", [["Power", "1400 W"], ["Drum", "15 litres"], ["Use", "Wet and dry"]]], ["In the box", [["Contents", "Vacuum, hose, 3 nozzles"]]]], tags: ["vacuum"], dd: 4, w: "1 year" },
      { t: "Cordless Stick Vacuum", st: "For the daily five minutes, not the weekly hour", sub: "floor-care", p: 8999, m: 12999, stk: 16,
        hl: ["Up to 35 minutes runtime", "Converts to handheld", "Washable HEPA filter", "Stands on its own"],
        sp: [["Basics", [["Runtime", "Up to 35 minutes"], ["Bin", "0.6 litres"], ["Filter", "Washable HEPA"]]], ["Charge", [["Time", "About 4 hours"]]]], tags: ["vacuum", "cordless"], dd: 4, w: "1 year" },
      { t: "Spin Mop with bucket", st: "Your hands never touch the water", sub: "floor-care", p: 1499, m: 2299, stk: 65,
        hl: ["Foot-pedal spin", "Two microfibre heads", "Bucket with wringer", "Rotating head for corners"],
        sp: [["Basics", [["Bucket", "12 litres"], ["Heads", "2 microfibre"], ["Spin", "Foot pedal"]]], ["Care", [["Heads", "Machine washable"]]]], tags: ["mop"] },
      { t: "Microfibre Cleaning Cloths, 12 pack", st: "The boring thing that makes everything else work", sub: "floor-care", p: 599, m: 999, stk: 150,
        hl: ["Twelve cloths, 40 × 40 cm", "Lint free", "Colour coded by room", "Washes 300 times"],
        sp: [["Basics", [["Pieces", "12"], ["Size", "40 × 40 cm"], ["GSM", "300"]]], ["Care", [["Washing", "Machine, no softener"]]]], tags: ["cloths"] },
      { t: "Long-Handle Floor Wiper", st: "Balcony to bathroom in one pass", sub: "floor-care", p: 649, m: 999, stk: 100,
        hl: ["45 cm silicone blade", "Steel handle", "Hangs on a hook", "Replaceable blade"],
        sp: [["Basics", [["Blade", "45 cm silicone"], ["Handle", "Steel, 120 cm"]]], ["Care", [["Blade", "Replaceable"]]]], tags: ["wiper"] },
      { t: "Pedal Dustbin 20L, steel", st: "Closes quietly, which you notice at night", sub: "household", p: 1899, m: 2799, stk: 48,
        hl: ["20 litres", "Soft-close lid", "Removable inner bucket", "Fingerprint-resistant steel"],
        sp: [["Basics", [["Capacity", "20 litres"], ["Material", "Stainless steel"], ["Lid", "Soft close"]]], ["Care", [["Inner", "Removable"]]]], tags: ["bin"] },
      { t: "Vacuum Storage Bags, set of 6", st: "A winter quilt down to the size of a pillow", sub: "household", p: 999, m: 1599, stk: 85,
        hl: ["Six bags, three sizes", "Hand pump included", "Reusable double seal", "Works with any vacuum hose"],
        sp: [["Basics", [["Pieces", "6"], ["Sizes", "Small, medium, large"]]], ["In the box", [["Contents", "6 bags, hand pump"]]]], tags: ["storage"] },
      { t: "Wardrobe Organiser Set, 6 pieces", st: "The drawer stops being a heap", sub: "household", p: 1299, m: 1999, stk: 72,
        hl: ["Six dividers", "Non-woven, breathable", "Folds flat", "Fits a standard drawer"],
        sp: [["Basics", [["Pieces", "6"], ["Material", "Non-woven fabric"]]], ["Care", [["Cleaning", "Wipe clean"]]]], tags: ["organiser"] },
    ],
  },
];

/* ------------------------------------------------------------------ */

const BRAND = {
  slug: "weekendcart",
  name: "WeekendCart",
  logoText: "WEEKENDCART",
  tagline: "Everyday things, chosen and stocked by us",
  origin: "India",
};

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

async function main() {
  const slugs = CATEGORIES.map((c) => c.slug);

  if (remove) {
    const cats = await db.category.findMany({ where: { slug: { in: slugs } }, select: { id: true, slug: true } });
    if (cats.length === 0) {
      console.log("Nothing to remove — none of these departments are in the database.");
      return;
    }
    const ids = cats.map((c) => c.id);

    // A product that has ever been ordered stays: an order line points at it
    // and the invoice has to keep resolving. Everything else goes.
    const ordered = await db.orderLine.findMany({
      where: { product: { categoryId: { in: ids } } },
      select: { productId: true },
      distinct: ["productId"],
    });
    const keep = new Set(ordered.map((o) => o.productId).filter(Boolean) as string[]);

    const doomed = await db.product.findMany({
      where: { categoryId: { in: ids }, id: { notIn: [...keep] } },
      select: { id: true },
    });
    const doomedIds = doomed.map((p) => p.id);

    await db.productImage.deleteMany({ where: { productId: { in: doomedIds } } });
    await db.product.deleteMany({ where: { id: { in: doomedIds } } });

    if (keep.size > 0) {
      console.log(`Kept ${keep.size} product(s) that have been ordered; their departments stay too.`);
      const stillUsed = await db.product.findMany({
        where: { categoryId: { in: ids } },
        select: { categoryId: true },
        distinct: ["categoryId"],
      });
      const busy = new Set(stillUsed.map((p) => p.categoryId));
      const free = ids.filter((id) => !busy.has(id));
      await db.subcategory.deleteMany({ where: { categoryId: { in: free } } });
      await db.category.deleteMany({ where: { id: { in: free } } });
      console.log(`Removed ${doomedIds.length} products and ${free.length} departments.`);
    } else {
      await db.subcategory.deleteMany({ where: { categoryId: { in: ids } } });
      await db.category.deleteMany({ where: { id: { in: ids } } });
      console.log(`Removed ${doomedIds.length} products and ${ids.length} departments.`);
    }
    return;
  }

  const brand = await db.brand.upsert({
    where: { slug: BRAND.slug },
    update: {},
    create: { ...BRAND, description: "Everyday things for the home, stocked in India." },
  });

  let madeCats = 0, madeSubs = 0, madeProducts = 0;

  for (const [ci, c] of CATEGORIES.entries()) {
    const pool = POOL[c.slug];
    if (!pool || pool.length < c.products.length) {
      throw new Error(`${c.slug}: ${c.products.length} products but only ${pool?.length ?? 0} photographs`);
    }

    const category = await db.category.upsert({
      where: { slug: c.slug },
      update: {
        name: c.name, menuLabel: c.menuLabel, icon: c.icon, accent: c.accent,
        description: c.description, imageUrl: photo(pool[c.face ?? 0]), imageAlt: c.name,
        defaultHsnCode: c.hsn, defaultTaxRate: c.tax, sortOrder: ci + 1, isActive: true,
      },
      create: {
        slug: c.slug, name: c.name, menuLabel: c.menuLabel, icon: c.icon, accent: c.accent,
        description: c.description, imageUrl: photo(pool[c.face ?? 0]), imageAlt: c.name,
        highlights: ["Free delivery over ₹999", "7-day returns", "Bought and invoiced by us"],
        defaultHsnCode: c.hsn, defaultTaxRate: c.tax, sortOrder: ci + 1,
      },
    });
    madeCats++;

    const subIds = new Map<string, string>();
    for (const [si, s] of c.subs.entries()) {
      const sub = await db.subcategory.upsert({
        where: { categoryId_slug: { categoryId: category.id, slug: s.slug } },
        update: {
          name: s.name, description: s.description,
          imageUrl: photo(pool[(si + 1) % pool.length]), imageAlt: s.name,
          sortOrder: si, isActive: true,
        },
        create: {
          categoryId: category.id, slug: s.slug, name: s.name, description: s.description,
          imageUrl: photo(pool[(si + 1) % pool.length]), imageAlt: s.name, sortOrder: si,
        },
      });
      subIds.set(s.slug, sub.id);
      madeSubs++;
    }

    for (const [pi, p] of c.products.entries()) {
      const subId = subIds.get(p.sub);
      if (!subId) throw new Error(`${c.slug}: product "${p.t}" names unknown collection "${p.sub}"`);

      const slug = slugify(p.t);
      const sku = `WC-${c.slug.slice(0, 3).toUpperCase()}-${String(pi + 1).padStart(3, "0")}`;
      const primary = pool[pi % pool.length];
      const secondary = pool[(pi + 1) % pool.length];

      const common = {
        title: p.t,
        subtitle: p.st,
        description: `${p.st}. ${p.hl.join(". ")}.`,
        price: p.p,
        mrp: p.m,
        hsnCode: c.hsn,
        taxRate: c.tax,
        stock: p.stk ?? 30,
        weightGrams: 1000,
        highlights: p.hl,
        specifications: p.sp.map(([group, rows]) => ({
          group,
          items: rows.map(([label, value]) => ({ label, value })),
        })),
        tags: p.tags ?? [],
        deliveryDays: p.dd ?? 3,
        warranty: p.w ?? "1 year against manufacturing defects",
        brandId: brand.id,
        categoryId: category.id,
        subcategoryId: subId,
        publishedAt: new Date(),
      };

      const product = await db.product.upsert({
        where: { slug },
        update: common,
        create: { slug, sku, ...common },
      });

      // Replace the photographs rather than adding to them, so a re-run does
      // not stack four copies of the same two pictures on every product.
      await db.productImage.deleteMany({ where: { productId: product.id } });
      await db.productImage.createMany({
        data: [
          { productId: product.id, url: photo(primary), alt: p.t, sortOrder: 0 },
          { productId: product.id, url: photo(secondary), alt: `${p.t} — in use`, sortOrder: 1 },
        ],
      });
      madeProducts++;
    }

    console.log(`  ${c.name.padEnd(24)} ${c.subs.length} collections, ${c.products.length} products`);
  }

  console.log(`\n${madeCats} departments, ${madeSubs} collections, ${madeProducts} products.`);
  console.log("Prices, stock and HSN codes are placeholders — see the note at the top of this file.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
