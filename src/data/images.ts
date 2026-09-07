/**
 * Centralised image layer.
 *
 * Every product / category / banner image in the storefront resolves through
 * this file. When the CMS or product DB goes live, only `img()` and the pools
 * below change — no component touches an image URL directly.
 */

const BASE = "https://images.unsplash.com/photo-";

export interface ImgOptions {
  w?: number;
  h?: number;
  /** `portrait` suits product cards, `wide` suits banners. */
  fit?: "portrait" | "square" | "wide" | "ultrawide";
  q?: number;
}

const RATIOS: Record<NonNullable<ImgOptions["fit"]>, [number, number]> = {
  portrait: [900, 1125],
  square: [900, 900],
  wide: [1600, 900],
  ultrawide: [2000, 800],
};

export function img(id: string, options: ImgOptions = {}) {
  const [rw, rh] = RATIOS[options.fit ?? "portrait"];
  const w = options.w ?? rw;
  const h = options.h ?? Math.round((w * rh) / rw);
  const params = new URLSearchParams({
    auto: "format",
    fit: "crop",
    crop: "entropy",
    w: String(w),
    h: String(h),
    q: String(options.q ?? 78),
  });
  return `${BASE}${id}?${params.toString()}`;
}

/** Verified Unsplash photo ids, grouped by merchandising intent. */
export const POOL = {
  phones: [
    "1511707171634-5f897ff02aa9",
    "1592750475338-74b7b21085ab",
    "1598327105666-5b89351aff97",
    "1580910051074-3eb694886505",
    "1510557880182-3d4d3cba35a5",
    "1556656793-08538906a9f8",
    "1601784551446-20c9e07cdbdb",
    "1574944985070-8f3ebc6b79d2",
    "1512499617640-c74ae3a79d37",
    "1585060544812-6b45742d762f",
  ],
  laptops: [
    "1517336714731-489689fd1ca8",
    "1496181133206-80ce9b88a853",
    "1541807084-5c52b6b3adef",
    "1531297484001-80022131f5a1",
    "1593642632823-8f785ba67e45",
    "1588872657578-7efd1f1555ed",
    "1611186871348-b1ce696e52c9",
    "1484788984921-03950022c9ef",
  ],
  audio: [
    "1505740420928-5e560c06d30e",
    "1546435770-a3e426bf472b",
    "1590658268037-6bf12165a8df",
    "1608043152269-423dbba4e7e1",
    "1484704849700-f032a568e944",
    "1583394838336-acd977736f90",
    "1558756520-22cfe5d382ca",
    "1610945415295-d9bbf067e59c",
  ],
  wearables: [
    "1523275335684-37898b6baf30",
    "1546868871-7041f2a55e12",
    "1579586337278-3befd40fd17a",
    "1524805444758-089113d48a6d",
    "1508685096489-7aacd43bd3b1",
    "1434493789847-2f02dc6ca35d",
    "1622434641406-a158123450f9",
  ],
  cameras: [
    "1526170375885-4d8ecf77b99f",
    "1502920917128-1aa500764cbd",
    "1516035069371-29a1b244cc32",
    "1495707902641-75cac588d2e9",
  ],
  womenwear: [
    "1490481651871-ab68de25d43d",
    "1539109136881-3be0616acf4b",
    "1595777457583-95e059d581b8",
    "1485968579580-b6d095142e6e",
    "1594633312681-425c7b97ccd1",
    "1551232864-3f0890e580d9",
  ],
  menwear: [
    "1602810318383-e386cc2a3ccf",
    "1516257984-b1b4d707412e",
    "1521572163474-6864f9cf17ab",
    "1596755094514-f87e34085b2c",
    "1620012253295-c15cc3e65df4",
    "1617137968427-85924c800a22",
  ],
  footwear: [
    "1542291026-7eec264c27ff",
    "1560769629-975ec94e6a86",
    "1491553895911-0055eca6402d",
    "1595950653106-6c9ebd614d3a",
    "1600269452121-4f2416e55c28",
    "1608231387042-66d1773070a5",
    "1549298916-b41d501d3772",
  ],
  bags: [
    "1553062407-98eeb64c6a62",
    "1584917865442-de89df76afd3",
    "1594223274512-ad4803739b7c",
    "1590874103328-eac38a683ce7",
  ],
  furniture: [
    "1555041469-a586c61ea9bc",
    "1493663284031-b7e3aefcae8e",
    "1567538096630-e0c55bd6374c",
    "1540574163026-643ea20ade25",
    "1524758631624-e2822e304c36",
    "1616486338812-3dadae4b4ace",
    "1586023492125-27b2c045efd7",
    "1583847268964-b28dc8f51f92",
  ],
  decor: [
    "1513519245088-0e12902e5a38",
    "1522708323590-d24dbb6b0267",
    "1519710164239-da123dc03ef4",
    "1534349762230-e0cadf78f5da",
    "1526057565006-20beab8dd2ed",
    "1594026112284-02bb6f3352fe",
  ],
  kitchen: [
    "1556909114-f6e7ad7d3136",
    "1590794056226-79ef3a8147e1",
    "1556910103-1c02745aae4d",
    "1600585152220-90363fe7e115",
    "1522771739844-6a9f6d5f14af",
    "1565183928294-7063f23ce0f8",
  ],
  beauty: [
    "1596462502278-27bfdc403348",
    "1571781926291-c477ebfd024b",
    "1522335789203-aabd1fc54bc9",
    "1612817288484-6f916006741a",
    "1620916566398-39f1143ab7be",
    "1556228720-195a672e8a03",
    "1631729371254-42c2892f0e6e",
    "1598440947619-2c35fc9aa908",
  ],
  jewellery: [
    "1515562141207-7a88fb7ce338",
    "1599643478518-a784e5dc4c8f",
    "1611591437281-460bfbe1220a",
    "1602173574767-37ac01994b2a",
    "1573408301185-9146fe634ad0",
    "1535632066927-ab7c9ab60908",
  ],
  fitness: [
    "1571019613454-1cb2f99b2d8b",
    "1517836357463-d25dfeac3438",
    "1534438327276-14e5300c3a48",
    "1546483875-ad9014c88eba",
    "1517649763962-0c623066013b",
    "1583454110551-21f2fa2afe61",
  ],
  books: [
    "1512820790803-83ca734da794",
    "1544716278-ca5e3f4abd8c",
    "1519682337058-a94d519337bc",
    "1524995997946-a1c2e315a42f",
    "1456735190827-d1262f71b8a3",
    "1531346878377-a5be20888e57",
  ],
  lifestyle: [
    "1607083206869-4c7672e72a8a",
    "1441986300917-64674bd600d8",
    "1472851294608-062f824d29cc",
    "1567401893414-76b7b1e5a7a5",
    "1607082348824-0a96f2a4b9da",
    "1550009158-9ebf69173e03",
    "1445205170230-053b83016050",
    "1556742049-0cfed4f6a45d",
    "1483985988355-763728e1935b",
    "1548036328-c9fa89d128fa",
  ],
} as const;

export type PoolKey = keyof typeof POOL;

/** Deterministically pick `count` ids from a pool, starting at `offset`. */
export function pickImages(pool: PoolKey, offset: number, count = 4) {
  const list = POOL[pool];
  return Array.from(
    { length: count },
    (_, i) => list[(offset + i * 3 + 1) % list.length],
  );
}
