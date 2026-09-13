
import { httpsFetch } from "@/lib/net/outbound";

/**
 * Delhivery One — the courier.
 *
 * Two environments, chosen by DELHIVERY_ENV: "staging" talks to Delhivery's
 * test host with a test token and moves nothing in the real world; "production"
 * talks to the live host with the live token. Everything else about the two is
 * identical, which is the point — what is proved on staging is what runs live,
 * and going live is a change of two lines in .env.
 *
 * Every call goes through httpsFetch rather than fetch: this server's outbound
 * connections are unreliable, and the helper races both address families and
 * retries a connection that got no answer.
 *
 * Nothing here touches the database. It turns Delhivery's shapes into ours and
 * back; src/services/shipping.ts decides what to do with the answers.
 */

const HOSTS = {
  staging: "https://staging-express.delhivery.com",
  production: "https://track.delhivery.com",
} as const;

export type DelhiveryEnv = keyof typeof HOSTS;

export interface DelhiveryConfig {
  env: DelhiveryEnv;
  token: string;
  /** The pickup location's name exactly as registered in the Delhivery One panel. */
  pickupLocation: string;
}

export function delhiveryConfig(): DelhiveryConfig | null {
  const token = process.env.DELHIVERY_API_TOKEN?.trim();
  const pickupLocation = process.env.DELHIVERY_PICKUP_LOCATION?.trim();
  const env = (process.env.DELHIVERY_ENV?.trim() || "staging") as DelhiveryEnv;
  if (!token || !pickupLocation || !(env in HOSTS)) return null;
  return { env, token, pickupLocation };
}

export function delhiveryConfigured() {
  return delhiveryConfig() !== null;
}

export class DelhiveryError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "DelhiveryError";
  }
}

async function request<T>(
  config: DelhiveryConfig,
  path: string,
  init: { method?: "GET" | "POST"; body?: string; contentType?: string; timeoutMs?: number } = {},
): Promise<T> {
  const response = await httpsFetch(`${HOSTS[config.env]}${path}`, {
    method: init.method ?? "GET",
    body: init.body,
    headers: {
      Authorization: `Token ${config.token}`,
      Accept: "application/json",
      ...(init.body ? { "Content-Type": init.contentType ?? "application/json" } : {}),
    },
    timeoutMs: init.timeoutMs ?? 15_000,
  });

  if (response.status === 401 || response.status === 403) {
    throw new DelhiveryError("Delhivery rejected the API token.", response.status);
  }
  if (response.status >= 500) {
    throw new DelhiveryError(`Delhivery answered HTTP ${response.status}.`, response.status);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(response.body);
  } catch {
    throw new DelhiveryError(
      `Delhivery answered HTTP ${response.status} with something other than JSON: ${response.body.slice(0, 120)}`,
      response.status,
    );
  }
  if (response.status >= 400) {
    const detail =
      typeof parsed === "object" && parsed !== null
        ? JSON.stringify(parsed).slice(0, 300)
        : String(parsed);
    throw new DelhiveryError(`Delhivery answered HTTP ${response.status}: ${detail}`, response.status);
  }
  return parsed as T;
}

/* --------------------------- Serviceability --------------------------- */

export interface Serviceability {
  serviceable: boolean;
  cod: boolean;
  prepaid: boolean;
  city: string;
  state: string;
}

/**
 * The shape seen from Delhivery's own API playground (staging, 2026-09): keys
 * come back sorted, with `cash`, `center[].cn`, `repl`, `state_code` among
 * them. The documented `cod` / `pre_paid` / `district` are read first and the
 * playground's names are the fallback, so either vintage of the answer works.
 */
interface PincodeRow {
  postal_code?: {
    pin?: number | string;
    city?: string;
    district?: string;
    state_code?: string;
    cod?: "Y" | "N";
    cash?: "Y" | "N";
    pre_paid?: "Y" | "N";
    pickup?: "Y" | "N";
    is_oda?: "Y" | "N";
    center?: { cn?: string }[];
  };
}

const yes = (...flags: (string | undefined)[]) => {
  const first = flags.find((f) => f !== undefined);
  return first === undefined ? true : first === "Y";
};

/** Whether Delhivery delivers to a pincode, and how it can be paid for. */
export async function checkPincode(config: DelhiveryConfig, pincode: string): Promise<Serviceability> {
  const data = await request<{ delivery_codes?: PincodeRow[] }>(
    config,
    `/c/api/pin-codes/json/?filter_codes=${encodeURIComponent(pincode)}`,
    { timeoutMs: 10_000 },
  );
  const row = data.delivery_codes?.[0]?.postal_code;
  if (!row) return { serviceable: false, cod: false, prepaid: false, city: "", state: "" };
  const state = row.state_code ?? "";
  return {
    serviceable: true,
    cod: yes(row.cod, row.cash),
    prepaid: yes(row.pre_paid),
    city: row.district ?? row.city ?? row.center?.[0]?.cn ?? "",
    // Staging answers a numeric placeholder here; only a real state code is shown.
    state: /^[A-Za-z]{2,3}$/.test(state) ? state.toUpperCase() : "",
  };
}

/* ------------------------------ Waybills ----------------------------- */

/** One fresh waybill (AWB) number from the account's allocation. */
export async function fetchWaybill(config: DelhiveryConfig): Promise<string> {
  const data = await request<string | { waybills?: string }>(config, "/waybill/api/bulk/json/?count=1");
  const raw = typeof data === "string" ? data : (data.waybills ?? "");
  const waybill = raw.split(",")[0]?.trim();
  if (!waybill) throw new DelhiveryError("Delhivery returned no waybill.");
  return waybill;
}

/* ------------------------------ Shipments ---------------------------- */

export interface ShipmentInput {
  orderNumber: string;
  invoiceNumber: string;
  /** Prepaid or cash on delivery; the amount to collect only for COD. */
  paymentMode: "Prepaid" | "COD";
  codAmountRupees: number;
  totalRupees: number;
  productsDescription: string;
  hsnCode: string;
  quantity: number;
  weightGrams: number;
  /** cm */
  length: number;
  width: number;
  height: number;
  consignee: {
    name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
  seller: {
    name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
  /** Leave empty to let Delhivery assign one; pass one from fetchWaybill to control it. */
  waybill?: string;
}

interface CreateResponse {
  success?: boolean;
  packages?: {
    status?: "Success" | "Fail";
    waybill?: string;
    remarks?: string[];
    serviceable?: boolean;
    refnum?: string;
  }[];
  rmk?: string;
  error?: string;
}

/**
 * Book a shipment. Delhivery's create endpoint takes a form body with a JSON
 * document inside it — that shape is theirs, not a mistake here.
 */
export async function createShipment(
  config: DelhiveryConfig,
  input: ShipmentInput,
): Promise<{ waybill: string; refnum?: string }> {
  const payload = {
    shipments: [
      {
        name: input.consignee.name,
        add: input.consignee.address,
        pin: input.consignee.pincode,
        city: input.consignee.city,
        state: input.consignee.state,
        country: "India",
        phone: input.consignee.phone,
        order: input.orderNumber,
        payment_mode: input.paymentMode,
        return_pin: input.seller.pincode,
        return_city: input.seller.city,
        return_phone: input.seller.phone,
        return_add: input.seller.address,
        return_state: input.seller.state,
        return_country: "India",
        products_desc: input.productsDescription.slice(0, 200),
        hsn_code: input.hsnCode,
        cod_amount: input.paymentMode === "COD" ? String(input.codAmountRupees) : "0",
        order_date: null,
        total_amount: String(input.totalRupees),
        seller_add: input.seller.address,
        seller_name: input.seller.name,
        seller_inv: input.invoiceNumber,
        quantity: String(input.quantity),
        waybill: input.waybill ?? "",
        shipment_length: String(input.length),
        shipment_width: String(input.width),
        shipment_height: String(input.height),
        weight: String(input.weightGrams),
        shipping_mode: "Surface",
        address_type: "home",
      },
    ],
    pickup_location: { name: config.pickupLocation },
  };

  const body = `format=json&data=${encodeURIComponent(JSON.stringify(payload))}`;
  const data = await request<CreateResponse>(config, "/api/cmu/create.json", {
    method: "POST",
    body,
    contentType: "application/x-www-form-urlencoded",
    timeoutMs: 20_000,
  });

  const pkg = data.packages?.[0];
  if (!pkg || pkg.status !== "Success" || !pkg.waybill) {
    const why = [...(pkg?.remarks ?? []), data.rmk, data.error].filter(Boolean).join("; ");
    throw new DelhiveryError(why || "Delhivery did not accept the shipment.");
  }
  return { waybill: pkg.waybill, refnum: pkg.refnum };
}

/**
 * Cancel a booked shipment before the courier collects it. Nothing is billed
 * for a shipment that is cancelled unpicked, which is also what makes a live
 * booking safe to test: book, look at it, cancel.
 */
export async function cancelShipment(config: DelhiveryConfig, waybill: string): Promise<void> {
  const data = await request<{ status?: boolean; error?: string; remarks?: string; message?: string }>(
    config,
    "/api/p/edit",
    { method: "POST", body: JSON.stringify({ waybill, cancellation: "true" }) },
  );
  if (data.status === false) {
    throw new DelhiveryError(data.error || data.remarks || data.message || "Delhivery refused to cancel the shipment.");
  }
}

/** Ask Delhivery to come and collect from the pickup location. */
export async function requestPickup(
  config: DelhiveryConfig,
  input: { date: string; time: string; expectedPackages: number },
): Promise<{ pickupId: string | number | null; raw: unknown }> {
  const data = await request<{ pickup_id?: string | number; incoming_center_name?: string }>(
    config,
    "/fm/request/new/",
    {
      method: "POST",
      body: JSON.stringify({
        pickup_time: input.time,
        pickup_date: input.date,
        pickup_location: config.pickupLocation,
        expected_package_count: input.expectedPackages,
      }),
    },
  );
  return { pickupId: data.pickup_id ?? null, raw: data };
}

/** A printable label / packing slip for a booked waybill. */
export async function packingSlipUrl(config: DelhiveryConfig, waybill: string): Promise<string | null> {
  const data = await request<{ packages?: { pdf_download_link?: string }[] }>(
    config,
    `/api/p/packing_slip?wbns=${encodeURIComponent(waybill)}&pdf=true`,
  );
  return data.packages?.[0]?.pdf_download_link ?? null;
}

/* ------------------------------- Tracking ---------------------------- */

export interface TrackingScan {
  at: string;
  scan: string;
  location: string;
  instructions: string;
}

export interface Tracking {
  status: string;
  /** Delhivery's coarse type: UD (on its way), DL (delivered), RT (returning). */
  statusType: string;
  location: string;
  at: string;
  instructions: string;
  expectedDelivery: string | null;
  scans: TrackingScan[];
}

interface TrackResponse {
  ShipmentData?: {
    Shipment?: {
      AWB?: string;
      ExpectedDeliveryDate?: string | null;
      Status?: {
        Status?: string;
        StatusType?: string;
        StatusLocation?: string;
        StatusDateTime?: string;
        Instructions?: string;
      };
      Scans?: {
        ScanDetail?: {
          Scan?: string;
          ScanDateTime?: string;
          ScannedLocation?: string;
          Instructions?: string;
        };
      }[];
    };
  }[];
  Error?: string;
}

export async function trackWaybill(config: DelhiveryConfig, waybill: string): Promise<Tracking | null> {
  const data = await request<TrackResponse>(
    config,
    `/api/v1/packages/json/?waybill=${encodeURIComponent(waybill)}&verbose=2`,
  );
  const shipment = data.ShipmentData?.[0]?.Shipment;
  if (!shipment?.Status) return null;

  return {
    status: shipment.Status.Status ?? "",
    statusType: shipment.Status.StatusType ?? "",
    location: shipment.Status.StatusLocation ?? "",
    at: shipment.Status.StatusDateTime ?? "",
    instructions: shipment.Status.Instructions ?? "",
    expectedDelivery: shipment.ExpectedDeliveryDate ?? null,
    scans: (shipment.Scans ?? [])
      .map((s) => s.ScanDetail)
      .filter((s): s is NonNullable<typeof s> => !!s)
      .map((s) => ({
        at: s.ScanDateTime ?? "",
        scan: s.Scan ?? "",
        location: s.ScannedLocation ?? "",
        instructions: s.Instructions ?? "",
      })),
  };
}

/**
 * Delhivery's status, in the shop's own terms.
 *
 * Delhivery's vocabulary is wider than the timeline a customer sees. This maps
 * the common stages to the five steps the storefront draws, and leaves the rest
 * as null — an event is still recorded, the order's status just does not move.
 */
export function mapDelhiveryStatus(t: Tracking): "PACKED" | "SHIPPED" | "OUT_FOR_DELIVERY" | "DELIVERED" | null {
  const s = t.status.toLowerCase();
  if (t.statusType === "DL" || s === "delivered") return "DELIVERED";
  if (s.includes("dispatched") || s.includes("out for delivery")) return "OUT_FOR_DELIVERY";
  if (s.includes("in transit") || s === "pending") return "SHIPPED";
  if (s.includes("manifested") || s.includes("not picked") || s.includes("picked")) return "PACKED";
  return null;
}
