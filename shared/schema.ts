import { sql } from "drizzle-orm";
import { pgTable, text, varchar, bigint, timestamp, real, integer } from "drizzle-orm/pg-core";
import { z } from "zod";
import { regionOptions, type Region } from "./regions";

export const genderEnum = ["male", "female", "unknown"] as const;
export type Gender = typeof genderEnum[number];

export const enrichmentStatusEnum = ["pending", "complete", "failed"] as const;
export type EnrichmentStatus = typeof enrichmentStatusEnum[number];

export const customers = pgTable("customers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  shopifyCustomerId: bigint("shopify_customer_id", { mode: "number" }).notNull().unique(),
  email: text("email"),
  phone: text("phone"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  city: text("city"),
  country: text("country"),
  province: text("province"),
  postalCode: text("postal_code"),
  tags: text("tags"),
  createdAtShopify: timestamp("created_at_shopify"),
  updatedAtShopify: timestamp("updated_at_shopify"),
  lastOrderAt: timestamp("last_order_at"),
  totalSpent: real("total_spent").default(0),
  ordersCount: integer("orders_count").default(0),
  genderInferred: text("gender_inferred").$type<Gender>(),
  genderConfidence: real("gender_confidence"),
  enrichmentStatus: text("enrichment_status").$type<EnrichmentStatus>().default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

export const syncLogs = pgTable("sync_logs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  syncType: text("sync_type").notNull(),
  status: text("status").notNull(),
  customersProcessed: integer("customers_processed").default(0),
  customersCreated: integer("customers_created").default(0),
  customersUpdated: integer("customers_updated").default(0),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export type SyncLog = typeof syncLogs.$inferSelect;
export type InsertSyncLog = typeof syncLogs.$inferInsert;

export const customerFilterSchema = z.object({
  genderInferred: z.array(z.enum(genderEnum)).optional(),
  createdFrom: z.string().optional(),
  createdTo: z.string().optional(),
  lastOrderFrom: z.string().optional(),
  lastOrderTo: z.string().optional(),
  city: z.array(z.string()).optional(),
  province: z.array(z.string()).optional(),
  region: z.enum(regionOptions).optional(),
  tag: z.string().optional(),
  minTotalSpent: z.number().min(0).optional(),
  maxTotalSpent: z.number().min(0).optional(),
  minOrdersCount: z.number().min(0).optional(),
  maxOrdersCount: z.number().min(0).optional(),
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(25),
  sortBy: z.enum(["createdAtShopify", "lastOrderAt", "firstName", "email", "totalSpent", "ordersCount"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export const customerExportFilterSchema = customerFilterSchema.extend({
  pageSize: z.number().min(1).default(10000),
});

export type CustomerFilter = z.infer<typeof customerFilterSchema>;
export type { Region };

export interface CustomerListResponse {
  data: Customer[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

export interface StatsSummary {
  totalCustomers: number;
  maleCount: number;
  femaleCount: number;
  unknownCount: number;
  pendingEnrichment: number;
  customersLast7Days: number;
  customersLast30Days: number;
  totalRevenue: number;
  averageOrderValue: number;
  averageLtv: number;
  countryBreakdown: { country: string; count: number }[];
}

export interface SyncStatus {
  lastSync: string | null;
  isRunning: boolean;
  customersCount: number;
}

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
