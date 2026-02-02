import cron from "node-cron";
import { storage } from "./storage";
import { fetchAllCustomers, type TransformedCustomer, updateCustomerTags } from "./shopifyClient";
import { enrichPendingCustomers } from "./enrichment";
import { log } from "./index";
import type { InsertCustomer, Customer } from "@shared/schema";

const INCREMENTAL_SYNC_START_DATE = process.env.INCREMENTAL_SYNC_START_DATE
  ? new Date(process.env.INCREMENTAL_SYNC_START_DATE)
  : undefined;

const SYNC_GENDER_TO_TAGS = process.env.SYNC_GENDER_TO_TAGS === "true";

let isSyncing = false;

interface SyncCustomersOptions {
  incremental?: boolean;
  startDate?: Date;
}

export async function syncGenderTagsToShopify(): Promise<number> {
  log("Starting bulk sync of gender tags to Shopify", "sync");
  let updatedCount = 0;
  
  const result = await storage.getCustomers({ 
    page: 1,
    pageSize: 10000,
    genderInferred: ["male", "female"] 
  });
  
  for (const customer of result.data) {
    try {
      await applyGenderTag(customer);
      updatedCount++;
    } catch (error) {
      log(`Failed to update gender tag for customer ${customer.shopifyCustomerId}: ${error}`, "sync");
    }
  }
  
  log(`Bulk sync completed: ${updatedCount} customers updated`, "sync");
  return updatedCount;
}

async function applyGenderTag(customer: Customer | InsertCustomer): Promise<void> {
  if (!customer.genderInferred || customer.genderInferred === "unknown") return;
  
  const genderTag = `gender:${customer.genderInferred}`;
  const existingTags = customer.tags ? customer.tags.split(",").map(t => t.trim()) : [];
  
  // Safeguard: strictly handle gender tag only
  const otherTags = existingTags.filter(t => !t.startsWith("gender:"));
  const newTags = [...otherTags, genderTag].join(", ");
  
  if (customer.tags !== newTags) {
    await updateCustomerTags(customer.shopifyCustomerId, newTags);
  }
}

export async function syncCustomers({
  incremental = true,
  startDate,
}: SyncCustomersOptions = {}): Promise<{
  processed: number;
  created: number;
  updated: number;
}> {
  if (isSyncing) {
    log("Sync already in progress, skipping...", "sync");
    return { processed: 0, created: 0, updated: 0 };
  }

  isSyncing = true;
  let syncLog;
  let processed = 0;
  let created = 0;
  let updated = 0;

  try {
    syncLog = await storage.createSyncLog({
      syncType: incremental ? "incremental" : "full",
      status: "running",
    });

    log(`Starting ${incremental ? "incremental" : "full"} customer sync`, "sync");

    let updatedAtMin: Date | undefined;
    if (incremental) {
      const baseDate = startDate || INCREMENTAL_SYNC_START_DATE;
      if (baseDate) {
        updatedAtMin = new Date(baseDate);
      } else {
        const latestLog = await storage.getLatestSyncLog();
        if (latestLog?.completedAt) {
          updatedAtMin = new Date(latestLog.completedAt);
        }
      }

      if (updatedAtMin) {
        updatedAtMin.setMinutes(updatedAtMin.getMinutes() - 5);
      }
    }

    if (updatedAtMin) {
      log(`Incremental sync starting from ${updatedAtMin.toISOString()}`, "sync");
    }

    const onBatch = async (customers: TransformedCustomer[]) => {
      for (const customer of customers) {
        const existing = await storage.getCustomerByShopifyId(customer.shopifyCustomerId);
        
        const insertData: InsertCustomer = {
          shopifyCustomerId: customer.shopifyCustomerId,
          email: customer.email,
          phone: customer.phone,
          firstName: customer.firstName,
          lastName: customer.lastName,
          city: customer.city,
          country: customer.country,
          province: customer.province,
          postalCode: customer.postalCode,
          tags: customer.tags,
          createdAtShopify: customer.createdAtShopify,
          updatedAtShopify: customer.updatedAtShopify,
          totalSpent: customer.totalSpent,
          ordersCount: customer.ordersCount,
          enrichmentStatus: existing?.enrichmentStatus || "pending",
          genderInferred: existing?.genderInferred,
          genderConfidence: existing?.genderConfidence,
        };

        const upserted = await storage.upsertCustomer(insertData);
        
        // Automated tagging for known gender
        if (SYNC_GENDER_TO_TAGS && upserted.genderInferred && upserted.genderInferred !== "unknown") {
          await applyGenderTag(upserted);
        }
        
        if (existing) {
          updated++;
        } else {
          created++;
        }
        processed++;
      }
      
      log(`Processed batch: ${customers.length} customers (total: ${processed})`, "sync");
    };

    await fetchAllCustomers(updatedAtMin, onBatch);

    await storage.updateSyncLog(syncLog.id, {
      status: "completed",
      customersProcessed: processed,
      customersCreated: created,
      customersUpdated: updated,
      completedAt: new Date(),
    });

    log(`Sync completed: ${processed} processed, ${created} created, ${updated} updated`, "sync");

    setTimeout(async () => {
      try {
        const enriched = await enrichPendingCustomers(20);
        if (enriched > 0) {
          log(`Enriched ${enriched} customers after sync`, "sync");
        }
      } catch (error) {
        log(`Post-sync enrichment error: ${error}`, "sync");
      }
    }, 1000);

    return { processed, created, updated };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`Sync failed: ${errorMessage}`, "sync");

    if (syncLog) {
      await storage.updateSyncLog(syncLog.id, {
        status: "failed",
        errorMessage,
        completedAt: new Date(),
      });
    }

    throw error;
  } finally {
    isSyncing = false;
  }
}

export function startSyncSchedule(): void {
  cron.schedule("0 2 * * *", async () => {
    log("Running daily incremental customer sync", "cron");
    try {
      await syncCustomers({ incremental: true });
    } catch (error) {
      log(`Scheduled sync failed: ${error}`, "cron");
    }
  });

  cron.schedule("*/5 * * * *", async () => {
    try {
      const enriched = await enrichPendingCustomers(10);
      if (enriched > 0) {
        log(`Enriched ${enriched} pending customers`, "cron");
      }
    } catch (error) {
      log(`Enrichment cron failed: ${error}`, "cron");
    }
  });

  log("Sync and enrichment schedules started", "cron");
}

export function isSyncInProgress(): boolean {
  return isSyncing;
}
