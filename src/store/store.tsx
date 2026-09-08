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
import { saveAddress, type PlaceOrderInput } from "@/services/commerce";
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
  /** Supplied by a business buyer who needs the invoice for input credit. */
  buyerGstin: string | null;
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
  /** Addresses typed here that no account has stored yet. Never dropped. */
  addressSync: Address[];
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
  addressSync: [],
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
    buyerGstin: null,
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
  | { type: "address/sync"; address: Address }
  | { type: "address/synced"; sent: Address; id: string | null }
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

/** Close enough to be the same doorstep, whatever ids the two copies carry. */
function sameAddress(a: Address, b: Address) {
  return (
    a.pincode === b.pincode &&
    a.line1.trim().toLowerCase() === b.line1.trim().toLowerCase() &&
    a.fullName.trim().toLowerCase() === b.fullName.trim().toLowerCase()
  );
}

function reducer(state: StoreState, action: Action): StoreState {
  switch (action.type) {
    case "hydrate": {
      const payload = { ...action.payload };
      // If the session answered first, the account's addresses are already
      // here and outrank the stored ones — but anything typed on this browser
      // and not yet saved still belongs beside them.
      if (state.customer && payload.addresses) {
        const known = new Set(state.addresses.map((a) => a.id));
        payload.addresses = [
          ...state.addresses,
          ...(payload.addressSync ?? []).filter((a) => !known.has(a.id)),
        ];
      }
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
        addressSync: state.addressSync.filter((a) => a.id !== action.id),
        checkout: {
          ...state.checkout,
          addressId:
            state.checkout.addressId === action.id
              ? (addresses[0]?.id ?? null)
              : state.checkout.addressId,
        },
      };
    }

    // An address typed into the checkout belongs on the account as well. A
    // guest's waits here until they have one to save it to. Only the latest
    // version of each is worth keeping — an edit supersedes what it changed.
    case "address/sync":
      return {
        ...state,
        addressSync: [
          ...state.addressSync.filter((a) => a.id !== action.address.id),
          action.address,
        ],
      };

    // The account has stored what we sent. It answers with the id the row
    // lives under, which everything still holding the local one now follows.
    // A save that failed keeps its place in the queue: the next session check
    // tries again rather than quietly dropping what was typed.
    case "address/synced": {
      const id = action.id;
      if (!id) return state;
      const addressSync = state.addressSync.filter((a) => a !== action.sent);
      const localId = action.sent.id;
      if (id === localId) return { ...state, addressSync };
      return {
        ...state,
        addresses: state.addresses.map((a) => (a.id === localId ? { ...a, id } : a)),
        addressSync: addressSync.map((a) => (a.id === localId ? { ...a, id } : a)),
        checkout: {
          ...state.checkout,
          addressId: state.checkout.addressId === localId ? id : state.checkout.addressId,
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
      if (!action.customer) {
        if (!state.customer) return { ...state, sessionChecked: true };
        // Signing out takes the account's addresses with it — leaving them
        // here would show them to whoever signs in next, and anything still
        // queued would be copied onto that account.
        return {
          ...state,
          customer: null,
          addresses: [],
          addressSync: [],
          checkout: { ...state.checkout, addressId: null },
          sessionChecked: true,
        };
      }
      // The account's rows replace whatever this browser was holding, except
      // for addresses typed here that it has not stored yet: those are kept,
      // and an edit still on its way outranks the row it will overwrite.
      const stored = new Set(action.addresses.map((a) => a.id));
      // A queued address belongs to whoever typed it. Another account signing
      // in on this browser does not inherit it.
      const queued =
        state.customer && state.customer.id !== action.customer.id ? [] : state.addressSync;
      const pending = new Map(queued.map((a) => [a.id, a]));
      // Typed the address they already had saved: it is the same place, so it
      // is the account's copy they carry on with rather than a second row.
      const already = new Map<string, string>();
      for (const draft of queued) {
        if (stored.has(draft.id)) continue;
        const match = action.addresses.find((row) => sameAddress(row, draft));
        if (match) already.set(draft.id, match.id);
      }
      const addressSync = queued.filter((a) => !already.has(a.id));
      const addresses = [
        ...action.addresses.map((a) => pending.get(a.id) ?? a),
        ...addressSync.filter((a) => !stored.has(a.id)),
      ];
      const selected = state.checkout.addressId;
      const addressId =
        (selected ? already.get(selected) : null) ??
        addresses.find((a) => a.id === selected)?.id ??
        addresses.find((a) => a.isDefault)?.id ??
        addresses[0]?.id ??
        null;
      return {
        ...state,
        customer: action.customer,
        addresses,
        addressSync,
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
  "addressSync",
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
    let retry: ReturnType<typeof setTimeout> | undefined;

    // A check that never answers leaves the checkout unable to tell a signed-in
    // customer from a guest, so a blip is tried again rather than left to sit.
    const check = (attempt: number) => {
      fetch("/api/me", { signal: abort.signal, cache: "no-store" })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error("session unavailable"))))
        .then((data: { customer: StoreCustomer | null; addresses: Address[] }) => {
          dispatch({ type: "session/set", customer: data.customer, addresses: data.addresses });
        })
        .catch(() => {
          if (abort.signal.aborted || attempt >= 2) return;
          retry = setTimeout(() => check(attempt + 1), 1200 * (attempt + 1));
        });
    };

    check(0);
    return () => {
      abort.abort();
      clearTimeout(retry);
    };
  }, [sessionKey]);

  /**
   * Addresses typed into the checkout, saved to the account they belong to —
   * whether they were typed before signing in or after. One request at a time
   * per address, so a second edit waits rather than creating a second row.
   * A save that fails leaves the address alone; it is still usable, and the
   * next session check queues it again.
   */
  const syncing = useRef(new Set<string>());

  useEffect(() => {
    if (!state.customer) return;
    for (const address of state.addressSync) {
      if (syncing.current.has(address.id)) continue;
      syncing.current.add(address.id);
      const settle = (id: string | null) => {
        syncing.current.delete(address.id);
        dispatch({ type: "address/synced", sent: address, id });
      };
      saveAddress(address)
        .then((result) => settle(result.ok ? result.data.id : null))
        .catch(() => settle(null));
    }
  }, [state.customer, state.addressSync]);

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
