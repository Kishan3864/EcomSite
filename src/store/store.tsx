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
import { usePathname } from "next/navigation";
import type { Address, CartLine, DeliverySpeed, PaymentMethodId } from "@/lib/types";
import type { PlaceOrderInput } from "@/services/commerce";
import type { StorefrontConfig } from "@/services/storefront-config";

/* ------------------------------------------------------------------ *
 * Client-side commerce state.
 *
 * The bag, wishlist and checkout draft live here and persist to
 * localStorage — they belong to the browser, not the server. Anything
 * the shop is the source of truth for (orders, saved addresses, who is
 * signed in) is read from the database instead: server components pass
 * it down, and `/api/me` refreshes the session-scoped parts on mount.
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

export interface StoreCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
  /** PASSWORD, GOOGLE or FACEBOOK — decides what the account screen offers. */
  authProvider: "PASSWORD" | "GOOGLE" | "FACEBOOK";
  /** Pre-selects the payment step for a returning customer. */
  preferredPayment: PaymentMethodId | null;
  upiId: string | null;
}

/**
 * What the review step hands to the processing screen. The order itself is
 * created by the server from `input`; `amount` is only what we quote on screen
 * while the request is in flight.
 */
export interface PendingCheckout {
  input: PlaceOrderInput;
  amount: number;
}

export interface StoreState {
  cart: CartLine[];
  saved: CartLine[];
  wishlist: WishlistItem[];
  recent: RecentItem[];
  /** Signed in: the customer's saved addresses. Guest: this browser's drafts. */
  addresses: Address[];
  customer: StoreCustomer | null;
  /** Set at the review step, consumed by the processing screen. */
  pendingCheckout: PendingCheckout | null;
  coupon: string | null;
  checkout: CheckoutDraft;
  recentSearches: string[];
  hydrated: boolean;
  /** True once `/api/me` has answered, so the header knows what to greet with. */
  sessionChecked: boolean;
}

const INITIAL: StoreState = {
  cart: [],
  saved: [],
  wishlist: [],
  recent: [],
  addresses: [],
  customer: null,
  pendingCheckout: null,
  coupon: null,
  checkout: {
    contact: null,
    addressId: null,
    deliveryId: "standard",
    paymentMethod: null,
    paymentDetail: null,
    giftWrap: false,
    deliveryDate: null,
  },
  recentSearches: [],
  hydrated: false,
  sessionChecked: false,
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
  | { type: "checkout/stage"; pending: PendingCheckout }
  | { type: "checkout/abort" }
  | { type: "checkout/complete" }
  | { type: "session/set"; customer: StoreCustomer | null; addresses: Address[] }
  | { type: "search/record"; term: string }
  | { type: "search/clear" };

function lineKey(productId: string, variantKey?: string) {
  return variantKey ? `${productId}::${variantKey}` : productId;
}

function reducer(state: StoreState, action: Action): StoreState {
  switch (action.type) {
    case "hydrate": {
      const payload = { ...action.payload };
      // If the session answered first, its addresses outrank the stored ones.
      if (state.customer) delete payload.addresses;
      return { ...state, ...payload, hydrated: true };
    }

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

    case "checkout/stage":
      return { ...state, pendingCheckout: action.pending };

    case "checkout/abort":
      return { ...state, pendingCheckout: null };

    // The order now lives in the database, so all that is left here is to empty
    // the bag and forget the coupon and payment choice.
    case "checkout/complete":
      return {
        ...state,
        pendingCheckout: null,
        cart: [],
        coupon: null,
        checkout: { ...state.checkout, paymentMethod: null, paymentDetail: null },
      };

    case "session/set": {
      if (!action.customer) return { ...state, customer: null, sessionChecked: true };
      // A signed-in customer's addresses come from their account, not this
      // browser; the checkout selection follows whichever is default.
      const addressId =
        action.addresses.find((a) => a.id === state.checkout.addressId)?.id ??
        action.addresses.find((a) => a.isDefault)?.id ??
        action.addresses[0]?.id ??
        null;
      return {
        ...state,
        customer: action.customer,
        addresses: action.addresses,
        checkout: { ...state.checkout, addressId },
        sessionChecked: true,
      };
    }

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

/** Routes where signing in, registering or signing out can happen. */
const SESSION_ROUTE = /^\/(login|register|account|checkout)/;

const PERSISTED: (keyof StoreState)[] = [
  "cart",
  "saved",
  "wishlist",
  "recent",
  "addresses",
  "pendingCheckout",
  "coupon",
  "checkout",
  "recentSearches",
];

interface StoreContextValue extends StoreState {
  dispatch: React.Dispatch<Action>;
  /** Delivery, payment and tax settings, read from the database by the shell. */
  config: StorefrontConfig;
  cartDrawerOpen: boolean;
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({
  config,
  children,
}: {
  config: StorefrontConfig;
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as Partial<StoreState>) : {};
      // Never restore these from storage — the server decides them.
      delete parsed.customer;
      delete parsed.sessionChecked;
      dispatch({ type: "hydrate", payload: parsed });
    } catch {
      dispatch({ type: "hydrate", payload: {} });
    }
    loaded.current = true;
  }, []);

  /**
   * Who is signed in, and their saved addresses. Fetched rather than rendered
   * so the catalogue pages stay static and cacheable.
   *
   * Re-checked whenever the visitor moves through a route where the session can
   * begin or end — signing in, registering, signing out of the account — since
   * those all happen server-side and the provider is never remounted. Browsing
   * the catalogue costs nothing extra.
   */
  const pathname = usePathname();
  const sessionKey = SESSION_ROUTE.test(pathname) ? pathname : "";

  useEffect(() => {
    const abort = new AbortController();
    fetch("/api/me", { signal: abort.signal, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { customer: StoreCustomer | null; addresses: Address[] } | null) => {
        if (!data) return;
        dispatch({ type: "session/set", customer: data.customer, addresses: data.addresses });
      })
      .catch(() => {
        /* offline or aborted — the guest experience still works */
      });
    return () => abort.abort();
  }, [sessionKey]);

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
    () => ({ ...state, dispatch, config, cartDrawerOpen, openCartDrawer, closeCartDrawer }),
    [state, config, cartDrawerOpen, openCartDrawer, closeCartDrawer],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}
