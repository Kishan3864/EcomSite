"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type {
  Address,
  CartLine,
  DeliverySpeed,
  Order,
  PaymentMethodId,
} from "@/lib/types";
import { savedAddresses } from "@/data/marketing";
import { demoOrders } from "@/data/orders";

/* ------------------------------------------------------------------ *
 * Client-side commerce state.
 *
 * Persisted to localStorage today; the same actions map one-to-one onto
 * `/api/cart`, `/api/wishlist` and `/api/orders` calls later — only the
 * reducer's side effects change, not any component that consumes it.
 * ------------------------------------------------------------------ */

export interface WishlistItem {
  productId: string;
  slug: string;
  title: string;
  brand: string;
  categorySlug: string;
  image: string;
  price: number;
  mrp: number;
  rating: number;
  stock: number;
  addedAt: string;
}

export interface RecentItem {
  productId: string;
  slug: string;
  title: string;
  image: string;
  price: number;
  mrp: number;
  viewedAt: string;
}

export interface CheckoutDraft {
  contact: { name: string; email: string; phone: string } | null;
  addressId: string | null;
  deliveryId: DeliverySpeed;
  paymentMethod: PaymentMethodId | null;
  paymentDetail: string | null;
  giftWrap: boolean;
  deliveryDate: string | null;
}

export interface StoreState {
  cart: CartLine[];
  saved: CartLine[];
  wishlist: WishlistItem[];
  recent: RecentItem[];
  addresses: Address[];
  orders: Order[];
  /** Built at the review step, consumed by the processing screen. */
  pendingOrder: Order | null;
  coupon: string | null;
  checkout: CheckoutDraft;
  recentSearches: string[];
  hydrated: boolean;
}

const INITIAL: StoreState = {
  cart: [],
  saved: [],
  wishlist: [],
  recent: [],
  addresses: savedAddresses,
  orders: demoOrders,
  pendingOrder: null,
  coupon: null,
  checkout: {
    contact: null,
    addressId: savedAddresses.find((a) => a.isDefault)?.id ?? null,
    deliveryId: "standard",
    paymentMethod: null,
    paymentDetail: null,
    giftWrap: false,
    deliveryDate: null,
  },
  recentSearches: [],
  hydrated: false,
};

type Action =
  | { type: "hydrate"; payload: Partial<StoreState> }
  | { type: "cart/add"; line: Omit<CartLine, "id">; quantity?: number }
  | { type: "cart/qty"; id: string; quantity: number }
  | { type: "cart/remove"; id: string }
  | { type: "cart/clear" }
  | { type: "cart/save"; id: string }
  | { type: "cart/unsave"; id: string }
  | { type: "cart/removeSaved"; id: string }
  | { type: "wishlist/toggle"; item: WishlistItem }
  | { type: "wishlist/remove"; productId: string }
  | { type: "recent/view"; item: RecentItem }
  | { type: "address/add"; address: Address }
  | { type: "address/update"; address: Address }
  | { type: "address/remove"; id: string }
  | { type: "coupon/set"; code: string | null }
  | { type: "checkout/patch"; patch: Partial<CheckoutDraft> }
  | { type: "order/pending"; order: Order }
  | { type: "order/place"; order: Order }
  | { type: "search/record"; term: string }
  | { type: "search/clear" };

function lineKey(productId: string, variantKey?: string) {
  return variantKey ? `${productId}::${variantKey}` : productId;
}

function reducer(state: StoreState, action: Action): StoreState {
  switch (action.type) {
    case "hydrate":
      return { ...state, ...action.payload, hydrated: true };

    case "cart/add": {
      const id = lineKey(action.line.productId, action.line.variantKey);
      const qty = action.quantity ?? action.line.quantity ?? 1;
      const existing = state.cart.find((l) => l.id === id);
      if (existing) {
        return {
          ...state,
          cart: state.cart.map((l) =>
            l.id === id
              ? { ...l, quantity: Math.min(l.stock, l.quantity + qty) }
              : l,
          ),
        };
      }
      return {
        ...state,
        cart: [...state.cart, { ...action.line, id, quantity: qty }],
      };
    }

    case "cart/qty":
      return {
        ...state,
        cart: state.cart
          .map((l) =>
            l.id === action.id
              ? { ...l, quantity: Math.max(0, Math.min(l.stock, action.quantity)) }
              : l,
          )
          .filter((l) => l.quantity > 0),
      };

    case "cart/remove":
      return { ...state, cart: state.cart.filter((l) => l.id !== action.id) };

    case "cart/clear":
      return { ...state, cart: [], coupon: null };

    case "cart/save": {
      const line = state.cart.find((l) => l.id === action.id);
      if (!line) return state;
      return {
        ...state,
        cart: state.cart.filter((l) => l.id !== action.id),
        saved: state.saved.some((l) => l.id === action.id)
          ? state.saved
          : [line, ...state.saved],
      };
    }

    case "cart/unsave": {
      const line = state.saved.find((l) => l.id === action.id);
      if (!line) return state;
      return {
        ...state,
        saved: state.saved.filter((l) => l.id !== action.id),
        cart: state.cart.some((l) => l.id === action.id)
          ? state.cart
          : [...state.cart, line],
      };
    }

    case "cart/removeSaved":
      return { ...state, saved: state.saved.filter((l) => l.id !== action.id) };

    case "wishlist/toggle": {
      const exists = state.wishlist.some((w) => w.productId === action.item.productId);
      return {
        ...state,
        wishlist: exists
          ? state.wishlist.filter((w) => w.productId !== action.item.productId)
          : [action.item, ...state.wishlist],
      };
    }

    case "wishlist/remove":
      return {
        ...state,
        wishlist: state.wishlist.filter((w) => w.productId !== action.productId),
      };

    case "recent/view":
      return {
        ...state,
        recent: [
          action.item,
          ...state.recent.filter((r) => r.productId !== action.item.productId),
        ].slice(0, 12),
      };

    case "address/add":
      return {
        ...state,
        addresses: [
          ...state.addresses.map((a) =>
            action.address.isDefault ? { ...a, isDefault: false } : a,
          ),
          action.address,
        ],
        checkout: { ...state.checkout, addressId: action.address.id },
      };

    case "address/update":
      return {
        ...state,
        addresses: state.addresses.map((a) =>
          a.id === action.address.id
            ? action.address
            : action.address.isDefault
              ? { ...a, isDefault: false }
              : a,
        ),
      };

    case "address/remove": {
      const addresses = state.addresses.filter((a) => a.id !== action.id);
      return {
        ...state,
        addresses,
        checkout: {
          ...state.checkout,
          addressId:
            state.checkout.addressId === action.id
              ? (addresses[0]?.id ?? null)
              : state.checkout.addressId,
        },
      };
    }

    case "coupon/set":
      return { ...state, coupon: action.code };

    case "checkout/patch":
      return { ...state, checkout: { ...state.checkout, ...action.patch } };

    case "order/pending":
      return { ...state, pendingOrder: action.order };

    case "order/place":
      return {
        ...state,
        orders: [action.order, ...state.orders],
        pendingOrder: null,
        cart: [],
        coupon: null,
        checkout: { ...state.checkout, paymentMethod: null, paymentDetail: null },
      };

    case "search/record":
      return {
        ...state,
        recentSearches: [
          action.term,
          ...state.recentSearches.filter(
            (t) => t.toLowerCase() !== action.term.toLowerCase(),
          ),
        ].slice(0, 6),
      };

    case "search/clear":
      return { ...state, recentSearches: [] };

    default:
      return state;
  }
}

const STORAGE_KEY = "mayura.store.v1";

const PERSISTED: (keyof StoreState)[] = [
  "cart",
  "saved",
  "wishlist",
  "recent",
  "addresses",
  "orders",
  "pendingOrder",
  "coupon",
  "checkout",
  "recentSearches",
];

interface StoreContextValue extends StoreState {
  dispatch: React.Dispatch<Action>;
  cartDrawerOpen: boolean;
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<StoreState>;
        // Demo orders always stay at the bottom of the list.
        const stored = parsed.orders ?? [];
        const merged = [
          ...stored.filter((o) => !demoOrders.some((d) => d.id === o.id)),
          ...demoOrders,
        ];
        dispatch({ type: "hydrate", payload: { ...parsed, orders: merged } });
      } else {
        dispatch({ type: "hydrate", payload: {} });
      }
    } catch {
      dispatch({ type: "hydrate", payload: {} });
    }
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!state.hydrated || !loaded.current) return;
    try {
      const snapshot = Object.fromEntries(
        PERSISTED.map((key) => [key, state[key]]),
      );
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      /* quota or private mode — the session still works, it just will not persist */
    }
  }, [state]);

  const openCartDrawer = useCallback(() => setCartDrawerOpen(true), []);
  const closeCartDrawer = useCallback(() => setCartDrawerOpen(false), []);

  const value = useMemo<StoreContextValue>(
    () => ({ ...state, dispatch, cartDrawerOpen, openCartDrawer, closeCartDrawer }),
    [state, cartDrawerOpen, openCartDrawer, closeCartDrawer],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}
