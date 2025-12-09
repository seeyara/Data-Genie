import {
  customers,
  syncLogs,
  type Customer,
  type InsertCustomer,
  type CustomerFilter,
  type CustomerListResponse,
  type StatsSummary,
  type SyncStatus,
  type InsertSyncLog,
  type SyncLog,
} from "@shared/schema";
import { regionStates } from "@shared/regions";
import { db } from "./db";
import { eq, sql, and, gte, lte, ilike, or, desc, asc, count, sum, avg } from "drizzle-orm";

export interface IStorage {
  upsertCustomer(customer: InsertCustomer): Promise<Customer>;
  upsertCustomers(customerList: InsertCustomer[]): Promise<number>;
  getCustomers(filter: CustomerFilter): Promise<CustomerListResponse>;
  getCustomerById(id: number): Promise<Customer | undefined>;
  getCustomerByShopifyId(shopifyId: number): Promise<Customer | undefined>;
  getStats(): Promise<StatsSummary>;
  getSyncStatus(): Promise<SyncStatus>;
  getDistinctTags(): Promise<string[]>;
  getDistinctCities(): Promise<string[]>;
  getDistinctProvinces(): Promise<string[]>;
  resetAllEnrichments(): Promise<number>;
  createSyncLog(log: InsertSyncLog): Promise<SyncLog>;
  updateSyncLog(id: number, updates: Partial<SyncLog>): Promise<void>;
  getLatestSyncLog(): Promise<SyncLog | undefined>;
}

export class DatabaseStorage implements IStorage {
  async upsertCustomer(customer: InsertCustomer): Promise<Customer> {
    const [result] = await db
      .insert(customers)
      .values(customer)
      .onConflictDoUpdate({
        target: customers.shopifyCustomerId,
        set: {
          email: customer.email,
          phone: customer.phone,
          firstName: customer.firstName,
          lastName: customer.lastName,
          city: customer.city,
          country: customer.country,
          province: customer.province,
          postalCode: customer.postalCode,
          tags: customer.tags,
          updatedAtShopify: customer.updatedAtShopify,
          lastOrderAt: customer.lastOrderAt,
          totalSpent: customer.totalSpent,
          ordersCount: customer.ordersCount,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  async upsertCustomers(customerList: InsertCustomer[]): Promise<number> {
    if (customerList.length === 0) return 0;

    let processed = 0;
    for (const customer of customerList) {
      try {
        await this.upsertCustomer(customer);
        processed++;
      } catch (error) {
        console.error(`Failed to upsert customer ${customer.shopifyCustomerId}:`, error);
      }
    }
    return processed;
  }

  async getCustomers(filter: CustomerFilter): Promise<CustomerListResponse> {
    const conditions = [];

    if (filter.genderInferred && filter.genderInferred.length > 0) {
      conditions.push(
        or(...filter.genderInferred.map((g) => eq(customers.genderInferred, g)))
      );
    }

    if (filter.createdFrom) {
      conditions.push(gte(customers.createdAtShopify, new Date(filter.createdFrom)));
    }

    if (filter.createdTo) {
      conditions.push(lte(customers.createdAtShopify, new Date(filter.createdTo)));
    }

    if (filter.lastOrderFrom) {
      conditions.push(gte(customers.lastOrderAt, new Date(filter.lastOrderFrom)));
    }

    if (filter.lastOrderTo) {
      conditions.push(lte(customers.lastOrderAt, new Date(filter.lastOrderTo)));
    }

    if (filter.city && filter.city.length > 0) {
      conditions.push(or(...filter.city.map((city) => eq(customers.city, city))));
    }

    if (filter.region) {
      const statesForRegion = regionStates[filter.region] || [];
      if (statesForRegion.length > 0) {
        conditions.push(
          or(...statesForRegion.map((state) => eq(customers.province, state)))
        );
      }
    }

    if (filter.province && filter.province.length > 0) {
      conditions.push(
        or(...filter.province.map((province) => eq(customers.province, province)))
      );
    }

    if (filter.tag) {
      conditions.push(ilike(customers.tags, `%${filter.tag}%`));
    }

    if (filter.minTotalSpent !== undefined) {
      conditions.push(gte(customers.totalSpent, filter.minTotalSpent));
    }

    if (filter.maxTotalSpent !== undefined) {
      conditions.push(lte(customers.totalSpent, filter.maxTotalSpent));
    }

    if (filter.minOrdersCount !== undefined) {
      conditions.push(gte(customers.ordersCount, filter.minOrdersCount));
    }

    if (filter.maxOrdersCount !== undefined) {
      conditions.push(lte(customers.ordersCount, filter.maxOrdersCount));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ count: count() })
      .from(customers)
      .where(whereClause);

    const totalCount = countResult?.count || 0;
    const page = filter.page || 1;
    const pageSize = filter.pageSize || 25;
    const offset = (page - 1) * pageSize;

    let orderByClause;
    const sortOrder = filter.sortOrder === "asc" ? asc : desc;
    
    switch (filter.sortBy) {
      case "firstName":
        orderByClause = sortOrder(customers.firstName);
        break;
      case "email":
        orderByClause = sortOrder(customers.email);
        break;
      case "lastOrderAt":
        orderByClause = sortOrder(customers.lastOrderAt);
        break;
      case "totalSpent":
        orderByClause = sortOrder(customers.totalSpent);
        break;
      case "ordersCount":
        orderByClause = sortOrder(customers.ordersCount);
        break;
      case "createdAtShopify":
      default:
        orderByClause = sortOrder(customers.createdAtShopify);
    }

    const data = await db
      .select()
      .from(customers)
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(pageSize)
      .offset(offset);

    return {
      data,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    };
  }

  async getCustomerById(id: number): Promise<Customer | undefined> {
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, id));
    return customer;
  }

  async getCustomerByShopifyId(shopifyId: number): Promise<Customer | undefined> {
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.shopifyCustomerId, shopifyId));
    return customer;
  }

  async getStats(): Promise<StatsSummary> {
    const [totalResult] = await db
      .select({ count: count() })
      .from(customers);

    const [maleResult] = await db
      .select({ count: count() })
      .from(customers)
      .where(eq(customers.genderInferred, "male"));

    const [femaleResult] = await db
      .select({ count: count() })
      .from(customers)
      .where(eq(customers.genderInferred, "female"));

    const [unknownResult] = await db
      .select({ count: count() })
      .from(customers)
      .where(eq(customers.genderInferred, "unknown"));

    const [pendingResult] = await db
      .select({ count: count() })
      .from(customers)
      .where(eq(customers.enrichmentStatus, "pending"));

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [last7Result] = await db
      .select({ count: count() })
      .from(customers)
      .where(gte(customers.createdAtShopify, sevenDaysAgo));

    const [last30Result] = await db
      .select({ count: count() })
      .from(customers)
      .where(gte(customers.createdAtShopify, thirtyDaysAgo));

    const countryBreakdown = await db
      .select({
        country: customers.country,
        count: count(),
      })
      .from(customers)
      .groupBy(customers.country)
      .orderBy(desc(count()))
      .limit(10);

    const [ltvResult] = await db
      .select({
        totalRevenue: sum(customers.totalSpent),
        totalOrders: sum(customers.ordersCount),
        avgLtv: avg(customers.totalSpent),
      })
      .from(customers);

    const totalRevenue = parseFloat(ltvResult?.totalRevenue as string) || 0;
    const totalOrders = parseInt(ltvResult?.totalOrders as string) || 0;
    const avgLtv = parseFloat(ltvResult?.avgLtv as string) || 0;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      totalCustomers: totalResult?.count || 0,
      maleCount: maleResult?.count || 0,
      femaleCount: femaleResult?.count || 0,
      unknownCount: unknownResult?.count || 0,
      pendingEnrichment: pendingResult?.count || 0,
      customersLast7Days: last7Result?.count || 0,
      customersLast30Days: last30Result?.count || 0,
      totalRevenue,
      averageOrderValue: avgOrderValue,
      averageLtv: avgLtv,
      countryBreakdown: countryBreakdown.map((c) => ({
        country: c.country || "Unknown",
        count: c.count,
      })),
    };
  }

  async getSyncStatus(): Promise<SyncStatus> {
    const latestLog = await this.getLatestSyncLog();
    
    const [countResult] = await db
      .select({ count: count() })
      .from(customers);

    return {
      lastSync: latestLog?.completedAt?.toISOString() || null,
      isRunning: latestLog?.status === "running",
      customersCount: countResult?.count || 0,
    };
  }

  async getDistinctTags(): Promise<string[]> {
    const results = await db
      .selectDistinct({ tags: customers.tags })
      .from(customers)
      .where(sql`${customers.tags} IS NOT NULL AND ${customers.tags} != ''`);

    const allTags = new Set<string>();
    results.forEach((row) => {
      if (row.tags) {
        row.tags.split(",").forEach((tag) => {
          const trimmed = tag.trim();
          if (trimmed) allTags.add(trimmed);
        });
      }
    });

    return Array.from(allTags).sort();
  }

  async getDistinctCities(): Promise<string[]> {
    const results = await db
      .selectDistinct({ city: customers.city })
      .from(customers)
      .where(sql`${customers.city} IS NOT NULL AND ${customers.city} != ''`)
      .orderBy(customers.city);

    return results.map((r) => r.city!).filter(Boolean);
  }

  async getDistinctProvinces(): Promise<string[]> {
    const results = await db
      .selectDistinct({ province: customers.province })
      .from(customers)
      .where(sql`${customers.province} IS NOT NULL AND ${customers.province} != ''`)
      .orderBy(customers.province);

    return results.map((r) => r.province!).filter(Boolean);
  }

  async resetAllEnrichments(): Promise<number> {
    const results = await db
      .update(customers)
      .set({
        genderInferred: null,
        genderConfidence: null,
        enrichmentStatus: "pending",
        updatedAt: new Date(),
      })
      .returning({ id: customers.id });

    return results.length;
  }

  async createSyncLog(log: InsertSyncLog): Promise<SyncLog> {
    const [result] = await db.insert(syncLogs).values(log).returning();
    return result;
  }

  async updateSyncLog(id: number, updates: Partial<SyncLog>): Promise<void> {
    await db.update(syncLogs).set(updates).where(eq(syncLogs.id, id));
  }

  async getLatestSyncLog(): Promise<SyncLog | undefined> {
    const [result] = await db
      .select()
      .from(syncLogs)
      .orderBy(desc(syncLogs.startedAt))
      .limit(1);
    return result;
  }
}

export const storage = new DatabaseStorage();
