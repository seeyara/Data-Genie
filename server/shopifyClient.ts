import { log } from "./index";

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_ADMIN_ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || "2024-01";

interface ShopifyCustomer {
  id: number;
  email: string | null;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  updated_at: string;
  tags: string;
  orders_count: number;
  total_spent: string;
  last_order_id: number | null;
  default_address?: {
    city: string | null;
    country: string | null;
    province: string | null;
    zip: string | null;
  } | null;
}

interface ShopifyCustomersResponse {
  customers: ShopifyCustomer[];
}

interface RateLimitInfo {
  current: number;
  max: number;
}

let lastRateLimitInfo: RateLimitInfo = { current: 0, max: 40 };

function parseRateLimitHeader(header: string | null): RateLimitInfo {
  if (!header) return { current: 0, max: 40 };
  const [current, max] = header.split("/").map(Number);
  return { current: current || 0, max: max || 40 };
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function shopifyFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_ADMIN_ACCESS_TOKEN) {
    throw new Error("Shopify credentials not configured");
  }

  const url = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}${endpoint}`;
  
  if (lastRateLimitInfo.current >= lastRateLimitInfo.max - 5) {
    log(`Approaching rate limit (${lastRateLimitInfo.current}/${lastRateLimitInfo.max}), waiting 2s...`, "shopify");
    await delay(2000);
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      "X-Shopify-Access-Token": SHOPIFY_ADMIN_ACCESS_TOKEN,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const rateLimitHeader = response.headers.get("X-Shopify-Shop-Api-Call-Limit");
  lastRateLimitInfo = parseRateLimitHeader(rateLimitHeader);

  if (response.status === 429) {
    const retryAfter = response.headers.get("Retry-After");
    const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 5000;
    log(`Rate limited, waiting ${waitTime}ms...`, "shopify");
    await delay(waitTime);
    return shopifyFetch<T>(endpoint, options);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Shopify API error ${response.status}: ${text}`);
  }

  return response.json() as Promise<T>;
}

export interface TransformedCustomer {
  shopifyCustomerId: number;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  city: string | null;
  country: string | null;
  province: string | null;
  postalCode: string | null;
  tags: string | null;
  ordersCount: number;
  totalSpent: number;
  createdAtShopify: Date;
  updatedAtShopify: Date;
}

function transformCustomer(customer: ShopifyCustomer): TransformedCustomer {
  return {
    shopifyCustomerId: customer.id,
    email: customer.email,
    phone: customer.phone,
    firstName: customer.first_name,
    lastName: customer.last_name,
    city: customer.default_address?.city || null,
    country: customer.default_address?.country || null,
    province: customer.default_address?.province || null,
    postalCode: customer.default_address?.zip || null,
    tags: customer.tags || null,
    ordersCount: customer.orders_count || 0,
    totalSpent: parseFloat(customer.total_spent) || 0,
    createdAtShopify: new Date(customer.created_at),
    updatedAtShopify: new Date(customer.updated_at),
  };
}

export async function fetchCustomers(
  updatedAtMin?: Date,
  limit = 250
): Promise<{ customers: TransformedCustomer[]; nextPageInfo?: string }> {
  let endpoint = `/customers.json?limit=${limit}`;
  
  if (updatedAtMin) {
    endpoint += `&updated_at_min=${updatedAtMin.toISOString()}`;
  }

  const data = await shopifyFetch<ShopifyCustomersResponse>(endpoint);
  
  return {
    customers: data.customers.map(transformCustomer),
  };
}

export async function fetchCustomersPage(
  pageInfo?: string,
  limit = 250
): Promise<{ customers: TransformedCustomer[]; nextPageInfo?: string }> {
  let endpoint = `/customers.json?limit=${limit}`;
  
  if (pageInfo) {
    endpoint = `/customers.json?limit=${limit}&page_info=${pageInfo}`;
  }

  const data = await shopifyFetch<ShopifyCustomersResponse>(endpoint);
  
  return {
    customers: data.customers.map(transformCustomer),
  };
}

export async function fetchAllCustomers(
  updatedAtMin?: Date,
  onBatch?: (customers: TransformedCustomer[]) => Promise<void>
): Promise<number> {
  let totalProcessed = 0;
  let hasMore = true;
  let pageInfo: string | undefined;
  
  while (hasMore) {
    const endpoint = pageInfo 
      ? `/customers.json?limit=250&page_info=${pageInfo}`
      : `/customers.json?limit=250${updatedAtMin ? `&updated_at_min=${updatedAtMin.toISOString()}` : ""}`;
    
    const response = await fetch(
      `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}${endpoint}`,
      {
        headers: {
          "X-Shopify-Access-Token": SHOPIFY_ADMIN_ACCESS_TOKEN!,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Shopify API error ${response.status}: ${text}`);
    }

    const rateLimitHeader = response.headers.get("X-Shopify-Shop-Api-Call-Limit");
    lastRateLimitInfo = parseRateLimitHeader(rateLimitHeader);

    const linkHeader = response.headers.get("Link");
    pageInfo = undefined;
    
    if (linkHeader) {
      const nextMatch = linkHeader.match(/<[^>]*page_info=([^>&]+)[^>]*>;\s*rel="next"/);
      if (nextMatch) {
        pageInfo = nextMatch[1];
      }
    }

    const data = (await response.json()) as ShopifyCustomersResponse;
    const transformedCustomers = data.customers.map(transformCustomer);
    
    if (onBatch && transformedCustomers.length > 0) {
      await onBatch(transformedCustomers);
    }
    
    totalProcessed += transformedCustomers.length;
    hasMore = !!pageInfo && data.customers.length === 250;
    
    if (lastRateLimitInfo.current >= lastRateLimitInfo.max - 5) {
      log(`Approaching rate limit, waiting 2s...`, "shopify");
      await delay(2000);
    } else {
      await delay(500);
    }
  }
  
  return totalProcessed;
}

export async function upsertCustomerMetafield(
  customerId: number,
  gender: string
): Promise<void> {
  const endpoint = `/customers/${customerId}/metafields.json`;
  
  await shopifyFetch(endpoint, {
    method: "POST",
    body: JSON.stringify({
      metafield: {
        namespace: "marketing",
        key: "inferred_gender",
        type: "single_line_text_field",
        value: gender,
        description: "LLM-inferred gender used for marketing segmentation.",
      },
    }),
  });
  
  log(`Updated metafield for customer ${customerId} with gender: ${gender}`, "shopify");
}

export function verifyWebhookSignature(
  body: Buffer | string,
  signature: string
): boolean {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) {
    log("SHOPIFY_WEBHOOK_SECRET not configured", "shopify");
    return false;
  }

  const crypto = require("crypto");
  const hash = crypto
    .createHmac("sha256", secret)
    .update(body, "utf8")
    .digest("base64");

  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
}
