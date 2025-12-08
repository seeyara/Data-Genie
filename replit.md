# Shopify Customer Segmenter

A production-ready marketing data layer for Shopify stores. This application mirrors Shopify customers into PostgreSQL, enriches them with AI-inferred gender, and provides a powerful UI for filtering and exporting customer segments.

## Overview

- **Purpose**: Marketing segmentation tool for Shopify stores
- **Stack**: Node.js/Express backend, React/Vite frontend, PostgreSQL database
- **AI**: OpenAI GPT for gender inference from customer names

## Features

1. **Customer Sync**: Automatically sync customers from Shopify every 15 minutes
2. **Gender Inference**: AI-powered gender prediction with confidence scores
3. **Filtering**: Advanced filters by gender, date ranges, location, tags
4. **CSV Export**: Export filtered customer segments
5. **Webhooks**: Real-time updates via Shopify webhooks
6. **Write-back**: Optionally write gender back to Shopify metafields

## Recent Changes

- December 8, 2025: Initial MVP implementation
  - Database schema for customers and sync logs
  - Shopify REST API client with rate limiting
  - OpenAI integration for gender inference
  - Full React dashboard with filters and export

## Environment Variables

Required secrets (configured in Replit Secrets):
- `SHOPIFY_STORE_DOMAIN` - Your Shopify store domain (e.g., store.myshopify.com)
- `SHOPIFY_ADMIN_ACCESS_TOKEN` - Admin API access token from custom app
- `SHOPIFY_WEBHOOK_SECRET` - Webhook shared secret
- `OPENAI_API_KEY` - OpenAI API key for gender inference
- `DATABASE_URL` - PostgreSQL connection string (auto-configured)

Optional:
- `WRITE_BACK_TO_SHOPIFY=true` - Enable writing gender metafields back to Shopify
- `SHOPIFY_API_VERSION` - Shopify API version (default: 2024-01)

## Project Architecture

```
├── client/                  # React frontend
│   └── src/
│       ├── components/      # UI components
│       │   ├── customers-table.tsx
│       │   ├── filters-panel.tsx
│       │   ├── stats-cards.tsx
│       │   └── ...
│       └── pages/
│           └── dashboard.tsx
├── server/                  # Express backend
│   ├── db.ts               # Database connection
│   ├── routes.ts           # API endpoints
│   ├── storage.ts          # Data access layer
│   ├── shopifyClient.ts    # Shopify API integration
│   ├── syncJob.ts          # Cron sync jobs
│   └── enrichment.ts       # OpenAI gender inference
└── shared/
    └── schema.ts           # Database schema & types
```

## API Endpoints

- `GET /api/customers` - List customers with filters
- `GET /api/customers/export` - Export CSV
- `GET /api/customers/filter-options` - Get distinct filter values
- `GET /api/stats/summary` - Dashboard statistics
- `GET /api/sync/status` - Sync status
- `POST /api/admin/sync/customers` - Trigger manual sync
- `POST /webhooks/customers/create` - Shopify webhook
- `POST /webhooks/customers/update` - Shopify webhook

## Webhook Configuration

Configure these webhooks in Shopify Admin > Settings > Notifications:
- `customers/create` → `https://your-app.replit.app/webhooks/customers/create`
- `customers/update` → `https://your-app.replit.app/webhooks/customers/update`

## User Preferences

- Theme: Dark mode preferred
- Font: Inter
- Design: Clean, professional analytics dashboard style
