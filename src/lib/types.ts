/* ------------------------------------------------------------------ *
 * Domain models. These mirror the shape a real API/DB will return, so
 * swapping the mock service layer for `fetch()` needs no UI changes.
 * ------------------------------------------------------------------ */

export type ID = string;

export interface ImageAsset {
  url: string;
  alt: string;
  /** Blur-friendly dominant colour, used as a placeholder background. */
  tone?: string;
}

export interface Brand {
  id: ID;
  slug: string;
  name: string;
  logoText: string;
  tagline: string;
  origin: string;
}

export interface Subcategory {
  id: ID;
  slug: string;
  name: string;
  categorySlug: string;
  image: ImageAsset;
  description: string;
}

export interface Category {
  id: ID;
  slug: string;
  name: string;
  description: string;
  /** Short label used in the mega menu column heading. */
  menuLabel: string;
  image: ImageAsset;
  icon: string;
  accent: string;
  subcategories: Subcategory[];
  featuredBrands: string[];
  highlights: string[];
}

export interface VariantOption {
  id: ID;
  label: string;
  value: string;
  /** Hex swatch for colour-type variants. */
  swatch?: string;
  priceDelta?: number;
  inStock: boolean;
}

export interface VariantGroup {
  id: ID;
  name: string;
  type: "color" | "size" | "storage" | "option";
  options: VariantOption[];
}

export interface Specification {
  group: string;
  items: { label: string; value: string }[];
}

export interface RatingBreakdown {
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
}

export interface Review {
  id: ID;
  productId: ID;
  author: string;
  location: string;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
  verified: boolean;
  helpfulCount: number;
  images?: string[];
}

export interface QuestionAnswer {
  id: ID;
  productId: ID;
  question: string;
  answer: string;
  askedBy: string;
  answeredBy: string;
  answeredAt: string;
  upvotes: number;
}

export type ProductBadge =
  | "bestseller"
  | "new"
  | "trending"
  | "limited"
  | "exclusive"
  | "handpicked";

export interface Product {
  id: ID;
  slug: string;
  title: string;
  subtitle: string;
  brandSlug: string;
  /** Resolved display name; present whenever the product came from the database. */
  brandName?: string;
  categorySlug: string;
  subcategorySlug: string;
  images: ImageAsset[];
  videoPoster?: string;
  price: number;
  mrp: number;
  currency: "INR";
  rating: number;
  reviewCount: number;
  ratingBreakdown: RatingBreakdown;
  stock: number;
  soldCount: number;
  badges: ProductBadge[];
  tags: string[];
  colors: string[];
  variants: VariantGroup[];
  highlights: string[];
  description: string;
  specifications: Specification[];
  deliveryDays: number;
  codAvailable: boolean;
  returnWindowDays: number;
  warranty: string;
  freeShipping: boolean;
  createdAt: string;
  /** Cross-sell references, resolved by the service layer. */
  relatedIds: ID[];
  bundleIds: ID[];
}

export interface Offer {
  id: ID;
  code: string;
  title: string;
  description: string;
  type: "percent" | "flat" | "shipping" | "bank";
  value: number;
  minSpend: number;
  maxDiscount?: number;
  expiresAt: string;
  categorySlug?: string;
  accent: string;
}

export interface Banner {
  id: ID;
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  image: ImageAsset;
  align: "left" | "right";
  theme: "dark" | "light";
}

export interface PromoTile {
  id: ID;
  title: string;
  subtitle: string;
  href: string;
  image: ImageAsset;
  cta: string;
}

/* ---------------------------- Commerce ---------------------------- */

export interface CartLine {
  id: string;
  productId: ID;
  slug: string;
  title: string;
  brand: string;
  categorySlug: string;
  image: string;
  price: number;
  mrp: number;
  quantity: number;
  variantLabel?: string;
  variantKey?: string;
  stock: number;
  deliveryDays: number;
  freeShipping: boolean;
}

export interface Address {
  id: ID;
  label: "Home" | "Work" | "Other";
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export type DeliverySpeed = "standard" | "express" | "scheduled";

export interface DeliveryOption {
  id: DeliverySpeed;
  name: string;
  description: string;
  price: number;
  minDays: number;
  maxDays: number;
}

export type PaymentMethodId = "upi" | "card" | "netbanking" | "wallet" | "cod";

export interface PaymentMethod {
  id: PaymentMethodId;
  name: string;
  description: string;
  badge?: string;
  offerText?: string;
}

export type OrderStatus =
  | "confirmed"
  | "packed"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "returned";

export interface OrderTrackingEvent {
  status: OrderStatus;
  title: string;
  description: string;
  location: string;
  at: string;
  done: boolean;
}

export interface Order {
  id: ID;
  number: string;
  placedAt: string;
  status: OrderStatus;
  lines: CartLine[];
  address: Address;
  delivery: DeliveryOption;
  paymentMethod: PaymentMethod;
  totals: OrderTotals;
  estimatedDelivery: string;
  tracking: OrderTrackingEvent[];
  courier: string;
  awb: string;
}

export interface OrderTotals {
  itemsTotal: number;
  mrpTotal: number;
  productDiscount: number;
  couponCode?: string;
  couponDiscount: number;
  shipping: number;
  tax: number;
  total: number;
  savings: number;
}

export interface Customer {
  id: ID;
  name: string;
  email: string;
  phone: string;
  memberSince: string;
  tier: "Silver" | "Gold" | "Peacock Club";
  avatarInitials: string;
  loyaltyPoints: number;
}

export interface ReturnRequest {
  id: ID;
  orderNumber: string;
  productTitle: string;
  image: string;
  reason: string;
  status: "requested" | "approved" | "picked_up" | "refunded" | "rejected";
  requestedAt: string;
  refundAmount: number;
  refundMode: string;
}

/* ------------------------- Query contracts ------------------------ */

export type SortKey =
  | "relevance"
  | "popularity"
  | "price_asc"
  | "price_desc"
  | "rating"
  | "newest"
  | "discount";

export interface ProductQuery {
  q?: string;
  category?: string;
  subcategory?: string;
  brands?: string[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  minDiscount?: number;
  colors?: string[];
  inStockOnly?: boolean;
  fastDelivery?: boolean;
  tags?: string[];
  sort?: SortKey;
  page?: number;
  perPage?: number;
}

export interface FacetValue {
  value: string;
  label: string;
  count: number;
  swatch?: string;
}

export interface ProductFacets {
  brands: FacetValue[];
  colors: FacetValue[];
  ratings: FacetValue[];
  discounts: FacetValue[];
  priceRange: { min: number; max: number };
  categories: FacetValue[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}
