import OpenAI from "openai";
import { db } from "./db";
import { customers } from "@shared/schema";
import { eq } from "drizzle-orm";
import { log } from "./index";
import { upsertCustomerMetafield } from "./shopifyClient";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const WRITE_BACK_TO_SHOPIFY = process.env.WRITE_BACK_TO_SHOPIFY === "true";

export interface GenderInferenceResult {
  gender: "male" | "female" | "unknown";
  confidence: number;
}

export async function inferGender(
  firstName: string | null,
  lastName: string | null,
  email: string | null,
  country: string | null
): Promise<GenderInferenceResult> {
  const nameParts = [firstName, lastName].filter(Boolean);
  let primaryIdentifier = nameParts.join(" ").trim();
  let identifierSource: "name" | "email" | "unknown" = nameParts.length > 0 ? "name" : "unknown";

  if (!primaryIdentifier) {
    const emailLocalPart = email?.split("@")[0]?.replace(/[._]/g, " ")?.trim();
    if (emailLocalPart) {
      primaryIdentifier = emailLocalPart;
      identifierSource = "email";
    }
  }

  const emailDomain = email?.split("@")[1] || "";

  const prompt = `Based on this person's information, infer their likely gender for marketing purposes.
Primary identifier (${identifierSource}): ${primaryIdentifier || "unknown"}
Email domain: ${emailDomain || "unknown"}
Country: ${country || "unknown"}

Respond with JSON only: {"gender": "male" | "female" | "unknown", "confidence": 0.0-1.0}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a gender inference assistant for marketing segmentation. Respond with valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: 50,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      return { gender: "unknown", confidence: 0 };
    }

    const result = JSON.parse(content) as GenderInferenceResult;
    
    const validGenders = ["male", "female", "unknown"];
    if (!validGenders.includes(result.gender)) {
      result.gender = "unknown";
    }
    result.confidence = Math.max(0, Math.min(1, result.confidence || 0));
    
    return result;
  } catch (error) {
    log(`Gender inference error: ${error}`, "enrichment");
    return { gender: "unknown", confidence: 0 };
  }
}

export async function enrichPendingCustomers(batchSize = 10): Promise<number> {
  const pendingCustomers = await db
    .select()
    .from(customers)
    .where(eq(customers.enrichmentStatus, "pending"))
    .limit(batchSize);

  if (pendingCustomers.length === 0) {
    return 0;
  }

  log(`Processing ${pendingCustomers.length} customers for enrichment`, "enrichment");

  let enrichedCount = 0;

  for (const customer of pendingCustomers) {
    try {
      const result = await inferGender(
        customer.firstName,
        customer.lastName,
        customer.email,
        customer.country
      );

      await db
        .update(customers)
        .set({
          genderInferred: result.gender,
          genderConfidence: result.confidence,
          enrichmentStatus: "complete",
          updatedAt: new Date(),
        })
        .where(eq(customers.id, customer.id));

      if (WRITE_BACK_TO_SHOPIFY && result.gender !== "unknown") {
        try {
          await upsertCustomerMetafield(customer.shopifyCustomerId, result.gender);
        } catch (shopifyError) {
          log(`Failed to write back to Shopify for customer ${customer.id}: ${shopifyError}`, "enrichment");
        }
      }

      enrichedCount++;
      
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (error) {
      log(`Failed to enrich customer ${customer.id}: ${error}`, "enrichment");
      
      await db
        .update(customers)
        .set({
          enrichmentStatus: "failed",
          updatedAt: new Date(),
        })
        .where(eq(customers.id, customer.id));
    }
  }

  log(`Enriched ${enrichedCount} customers`, "enrichment");
  return enrichedCount;
}

export async function enrichAllPendingCustomers(batchSize = 10): Promise<number> {
  let totalEnriched = 0;
  let hasMore = true;

  while (hasMore) {
    const enriched = await enrichPendingCustomers(batchSize);
    totalEnriched += enriched;
    hasMore = enriched > 0;

    if (hasMore) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return totalEnriched;
}

export async function runEnrichmentLoop(): Promise<void> {
  log("Starting enrichment loop", "enrichment");
  
  let hasMore = true;
  let totalEnriched = 0;
  
  while (hasMore) {
    const enriched = await enrichPendingCustomers(10);
    totalEnriched += enriched;
    hasMore = enriched > 0;
    
    if (hasMore) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  
  log(`Enrichment loop complete. Total enriched: ${totalEnriched}`, "enrichment");
}
