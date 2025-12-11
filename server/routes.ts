import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { customerExportFilterSchema, customerFilterSchema } from "@shared/schema";
import { syncCustomers, startSyncSchedule, isSyncInProgress } from "./syncJob";
import { verifyWebhookSignature } from "./shopifyClient";
import { enrichAllPendingCustomers } from "./enrichment";
import Papa from "papaparse";
import { log } from "./index";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  startSyncSchedule();

  app.get("/api/customers", async (req: Request, res: Response) => {
    try {
      const genderInferred = req.query.genderInferred;
      const genderArray = Array.isArray(genderInferred)
        ? genderInferred.map(String)
        : genderInferred
        ? [String(genderInferred)]
        : undefined;

      const city = req.query.city;
      const cityArray = Array.isArray(city)
        ? city.map(String)
        : city
        ? [String(city)]
        : undefined;

      const province = req.query.province;
      const provinceArray = Array.isArray(province)
        ? province.map(String)
        : province
        ? [String(province)]
        : undefined;

      const filter = customerFilterSchema.parse({
        genderInferred: genderArray,
        createdFrom: req.query.createdFrom as string | undefined,
        createdTo: req.query.createdTo as string | undefined,
        lastOrderFrom: req.query.lastOrderFrom as string | undefined,
        lastOrderTo: req.query.lastOrderTo as string | undefined,
        city: cityArray,
        province: provinceArray,
        region: req.query.region as any,
        tag: req.query.tag as string | undefined,
        minTotalSpent: req.query.minTotalSpent
          ? parseFloat(req.query.minTotalSpent as string)
          : undefined,
        maxTotalSpent: req.query.maxTotalSpent
          ? parseFloat(req.query.maxTotalSpent as string)
          : undefined,
        minOrdersCount: req.query.minOrdersCount
          ? parseInt(req.query.minOrdersCount as string)
          : undefined,
        maxOrdersCount: req.query.maxOrdersCount
          ? parseInt(req.query.maxOrdersCount as string)
          : undefined,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : 25,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
      });

      const result = await storage.getCustomers(filter);
      res.json(result);
    } catch (error) {
      log(`Error fetching customers: ${error}`, "api");
      res.status(400).json({ error: "Invalid request parameters" });
    }
  });

  app.get("/api/customers/export", async (req: Request, res: Response) => {
    try {
      const genderInferred = req.query.genderInferred;
      const genderArray = Array.isArray(genderInferred)
        ? genderInferred.map(String)
        : genderInferred
        ? [String(genderInferred)]
        : undefined;

      const city = req.query.city;
      const cityArray = Array.isArray(city)
        ? city.map(String)
        : city
        ? [String(city)]
        : undefined;

      const province = req.query.province;
      const provinceArray = Array.isArray(province)
        ? province.map(String)
        : province
        ? [String(province)]
        : undefined;

      const filter = customerExportFilterSchema.parse({
        genderInferred: genderArray,
        createdFrom: req.query.createdFrom as string | undefined,
        createdTo: req.query.createdTo as string | undefined,
        lastOrderFrom: req.query.lastOrderFrom as string | undefined,
        lastOrderTo: req.query.lastOrderTo as string | undefined,
        city: cityArray,
        province: provinceArray,
        region: req.query.region as any,
        tag: req.query.tag as string | undefined,
        minTotalSpent: req.query.minTotalSpent
          ? parseFloat(req.query.minTotalSpent as string)
          : undefined,
        maxTotalSpent: req.query.maxTotalSpent
          ? parseFloat(req.query.maxTotalSpent as string)
          : undefined,
        minOrdersCount: req.query.minOrdersCount
          ? parseInt(req.query.minOrdersCount as string)
          : undefined,
        maxOrdersCount: req.query.maxOrdersCount
          ? parseInt(req.query.maxOrdersCount as string)
          : undefined,
        page: 1,
        pageSize: 10000,
      });

      const result = await storage.getCustomers(filter);
      const exportFormat =
        typeof req.query.format === "string"
          ? req.query.format.toLowerCase()
          : undefined;

      const exportedCount = result.data.length;

      if (exportFormat === "interakt") {
        const fields = [
          "Name",
          "Full Phone Number",
          "Phone Number",
          "Country Code",
          "Email",
          "Appointment Time",
          "WhatsApp Opted",
        ];

        const phoneForInterakt = (phone: string | null) => {
          const digits = (phone || "").replace(/\D/g, "");
          if (!digits) return { full: "", local: "" };

          const local = digits.startsWith("91")
            ? digits.slice(2)
            : digits.length > 10
            ? digits.slice(-10)
            : digits;

          const normalizedLocal = local || "";
          const full = normalizedLocal ? `91${normalizedLocal}` : "";
          return { full, local: normalizedLocal };
        };

        const csvRows = result.data.map((customer) => {
          const name = [customer.firstName, customer.lastName]
            .filter(Boolean)
            .join(" ");
          const phone = phoneForInterakt(customer.phone || "");

          return [
            name,
            phone.full,
            phone.local,
            "91",
            "",
            "",
            "true",
          ];
        });

        const csv = Papa.unparse({ fields, data: csvRows });

        try {
          await storage.recordExport("interakt", exportedCount);
        } catch (logError) {
          log(`Failed to record interakt export: ${logError}`, "api");
        }

        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="customers-interakt-export-${new Date()
            .toISOString()
            .split("T")[0]}.csv"`
        );
        res.send(csv);
      } else {
        const csvData = result.data.map((customer) => ({
          name: [customer.firstName, customer.lastName].filter(Boolean).join(" "),
          email: customer.email || "",
          phone: customer.phone || "",
          city: customer.city || "",
          country: customer.country || "",
          tags: customer.tags || "",
          gender_inferred: customer.genderInferred || "",
          gender_confidence: customer.genderConfidence?.toFixed(2) || "",
          total_spent: customer.totalSpent?.toFixed(2) || "0.00",
          orders_count: customer.ordersCount || 0,
          created_at_shopify: customer.createdAtShopify?.toISOString() || "",
          last_order_at: customer.lastOrderAt?.toISOString() || "",
        }));

        const csv = Papa.unparse(csvData);

        try {
          await storage.recordExport(exportFormat || "csv", exportedCount);
        } catch (logError) {
          log(`Failed to record export: ${logError}`, "api");
        }

        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="customers-export-${new Date().toISOString().split("T")[0]}.csv"`
        );
        res.send(csv);
      }
    } catch (error) {
      log(`Error exporting customers: ${error}`, "api");
      res.status(500).json({ error: "Export failed" });
    }
  });

  app.get("/api/customers/filter-options", async (_req: Request, res: Response) => {
    try {
      const [tags, cities, provinces] = await Promise.all([
        storage.getDistinctTags(),
        storage.getDistinctCities(),
        storage.getDistinctProvinces(),
      ]);

      res.json({ tags, cities, provinces });
    } catch (error) {
      log(`Error fetching filter options: ${error}`, "api");
      res.status(500).json({ error: "Failed to fetch filter options" });
    }
  });

  app.get("/api/stats/summary", async (_req: Request, res: Response) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      log(`Error fetching stats: ${error}`, "api");
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  app.get("/api/exports/activity", async (req: Request, res: Response) => {
    try {
      const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;
      const activity = await storage.getExportActivity(Number.isFinite(days) ? days : 30);
      res.json(activity);
    } catch (error) {
      log(`Error fetching export activity: ${error}`, "api");
      res.status(500).json({ error: "Failed to fetch export activity" });
    }
  });

  app.get("/api/sync/status", async (_req: Request, res: Response) => {
    try {
      const status = await storage.getSyncStatus();
      status.isRunning = isSyncInProgress();
      res.json(status);
    } catch (error) {
      log(`Error fetching sync status: ${error}`, "api");
      res.status(500).json({ error: "Failed to fetch sync status" });
    }
  });

  app.post("/api/admin/sync/customers", async (req: Request, res: Response) => {
    try {
      if (isSyncInProgress()) {
        res.status(409).json({ error: "Sync already in progress" });
        return;
      }

      const { startDate } = req.body || {};
      const parsedStartDate = startDate ? new Date(startDate) : undefined;
      if (startDate && isNaN(parsedStartDate?.getTime() ?? NaN)) {
        res.status(400).json({ error: "Invalid startDate provided" });
        return;
      }

      syncCustomers({ incremental: true, startDate: parsedStartDate }).catch((error) => {
        log(`Background sync failed: ${error}`, "api");
      });

      res.json({ message: "Sync started", status: "running" });
    } catch (error) {
      log(`Error starting sync: ${error}`, "api");
      res.status(500).json({ error: "Failed to start sync" });
    }
  });

  app.post("/api/admin/enrich", async (_req: Request, res: Response) => {
    try {
      const enriched = await enrichAllPendingCustomers(50);
      res.json({ message: "Enrichment completed", enrichedCount: enriched });
    } catch (error) {
      log(`Error running enrichment: ${error}`, "api");
      res.status(500).json({ error: "Enrichment failed" });
    }
  });

  app.post("/api/admin/enrich/reset", async (_req: Request, res: Response) => {
    try {
      const updated = await storage.resetAllEnrichments();
      res.json({
        message: "Enrichment statuses reset",
        customersMarkedPending: updated,
      });
    } catch (error) {
      log(`Error resetting enrichment: ${error}`, "api");
      res.status(500).json({ error: "Failed to reset enrichment statuses" });
    }
  });

  app.post("/webhooks/customers/create", async (req: Request, res: Response) => {
    const signature = req.headers["x-shopify-hmac-sha256"] as string;
    
    if (!signature || !verifyWebhookSignature(req.rawBody as Buffer, signature)) {
      log("Invalid webhook signature for customer create", "webhook");
      res.status(401).json({ error: "Invalid signature" });
      return;
    }

    try {
      const customer = req.body;
      
      await storage.upsertCustomer({
        shopifyCustomerId: customer.id,
        email: customer.email,
        phone: customer.phone,
        firstName: customer.first_name,
        lastName: customer.last_name,
        city: customer.default_address?.city,
        country: customer.default_address?.country,
        province: customer.default_address?.province,
        postalCode: customer.default_address?.zip,
        tags: customer.tags,
        ordersCount: customer.orders_count || 0,
        totalSpent: parseFloat(customer.total_spent) || 0,
        createdAtShopify: new Date(customer.created_at),
        updatedAtShopify: new Date(customer.updated_at),
        enrichmentStatus: "pending",
      });

      log(`Webhook: Created customer ${customer.id}`, "webhook");
      res.status(200).json({ success: true });
    } catch (error) {
      log(`Webhook error (customer create): ${error}`, "webhook");
      res.status(500).json({ error: "Failed to process webhook" });
    }
  });

  app.post("/webhooks/customers/update", async (req: Request, res: Response) => {
    const signature = req.headers["x-shopify-hmac-sha256"] as string;
    
    if (!signature || !verifyWebhookSignature(req.rawBody as Buffer, signature)) {
      log("Invalid webhook signature for customer update", "webhook");
      res.status(401).json({ error: "Invalid signature" });
      return;
    }

    try {
      const customer = req.body;
      const existing = await storage.getCustomerByShopifyId(customer.id);
      
      await storage.upsertCustomer({
        shopifyCustomerId: customer.id,
        email: customer.email,
        phone: customer.phone,
        firstName: customer.first_name,
        lastName: customer.last_name,
        city: customer.default_address?.city,
        country: customer.default_address?.country,
        province: customer.default_address?.province,
        postalCode: customer.default_address?.zip,
        tags: customer.tags,
        ordersCount: customer.orders_count || 0,
        totalSpent: parseFloat(customer.total_spent) || 0,
        createdAtShopify: new Date(customer.created_at),
        updatedAtShopify: new Date(customer.updated_at),
        enrichmentStatus: existing?.enrichmentStatus || "pending",
        genderInferred: existing?.genderInferred,
        genderConfidence: existing?.genderConfidence,
      });

      log(`Webhook: Updated customer ${customer.id}`, "webhook");
      res.status(200).json({ success: true });
    } catch (error) {
      log(`Webhook error (customer update): ${error}`, "webhook");
      res.status(500).json({ error: "Failed to process webhook" });
    }
  });

  return httpServer;
}
