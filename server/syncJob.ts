import cron from "node-cron";
import { storage } from "./storage";
import { fetchAllCustomers, type TransformedCustomer } from "./shopifyClient";
import { enrichPendingCustomers, inferGender } from "./enrichment";
import { log } from "./index";
import type { InsertCustomer } from "@shared/schema";

const INCREMENTAL_SYNC_START_DATE = process.env.INCREMENTAL_SYNC_START_DATE
  ? new Date(process.env.INCREMENTAL_SYNC_START_DATE)
  : undefined;

let isSyncing = false;

interface SyncCustomersOptions {
  incremental?: boolean;
  startDate?: Date;
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
        const latestCustomerDate = await storage.getLatestCustomerUpdatedAt();
        if (latestCustomerDate) {
          updatedAtMin = new Date(latestCustomerDate);
        } else {
          const latestLog = await storage.getLatestSyncLog();
          if (latestLog?.completedAt) {
            updatedAtMin = new Date(latestLog.completedAt);
          }
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

        const shouldInfer = !existing || existing.enrichmentStatus !== "complete";
        const genderInference = shouldInfer
          ? await inferGender(
              customer.firstName,
              customer.lastName,
              customer.email,
              customer.country,
            )
          : undefined;

        const shouldPersistInference = (genderInference?.gender || "unknown") !== "unknown";

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
          enrichmentStatus:
            shouldPersistInference
              ? "complete"
              : existing?.enrichmentStatus || "pending",
          genderInferred: shouldPersistInference
            ? genderInference?.gender
            : existing?.genderInferred,
          genderConfidence: shouldPersistInference
            ? genderInference?.confidence
            : existing?.genderConfidence,
        };

        await storage.upsertCustomer(insertData);
        
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
