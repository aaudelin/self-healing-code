# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AIOps Self-Healing Pipeline - A TypeScript monorepo for automated incident detection and remediation. Connects to external services (Vercel logs, GitHub repos, Supabase DB, Linear tickets) and orchestrates AI agents to analyze and fix detected errors.

## Commands

```bash
# Development
pnpm install              # Install all dependencies
pnpm dev                  # Run all dev servers (web :3000, api :4000)
pnpm build                # Build all apps and packages
pnpm lint                 # Lint all packages
pnpm format               # Format with Prettier

# Database (from root or packages/database)
pnpm db:generate          # Generate Prisma client
pnpm db:push              # Push schema to DB
pnpm db:migrate           # Run migrations
pnpm --filter @aiops/database db:studio  # Open Prisma Studio

# Testing
pnpm test                 # Run unit tests
pnpm test:e2e             # Run Playwright E2E tests

# Filtered commands
pnpm --filter @aiops/api dev   # API only
pnpm --filter @aiops/web dev   # Web only

# Local database
docker compose up         # PostgreSQL on :5432
```

## Architecture

```
apps/
  api/       # NestJS backend with tRPC server
  web/       # Next.js 14 (App Router) frontend
packages/
  database/  # Prisma schema and client
  shared/    # Shared types and Zod schemas
  eslint-config/
  tsconfig/
e2e/         # Playwright tests
```

### Key Patterns

- **tRPC**: End-to-end type-safe API between web and api apps
- **Prisma**: Database access via `@aiops/database` package
- **Shared types**: Import from `@aiops/shared` for cross-app types and Zod schemas
- **AI Agents**: Analysis and Remediation agents in `apps/api/src/modules/agents/` using Anthropic SDK (claude-sonnet-4-6)

### Backend Modules (apps/api/src/modules/)

- `agents/` - AI agents for analysis and remediation
- `providers/` - External service integrations (GitHub, Vercel, Supabase, Linear)
- `pipelines/` - Pipeline CRUD and configuration
- `runs/` - Pipeline execution engine
- `trpc/` - tRPC router definitions

### Database Models

- **Pipeline**: Workflow configuration with integrations
- **Integration**: Provider configs (LOGS/REPOSITORY/DATABASE/TICKETING)
- **PipelineRun**: Execution instance with status lifecycle
- **RunStep**: Individual execution steps (6 per run)

### Pipeline Execution Flow

1. Log Ingestion (Vercel) - Fetch error logs
2. Repository Clone (GitHub) - Clone codebase
3. Database Schema (Supabase) - Get schema context
4. Analysis Agent (Linear) - Root cause analysis, create ticket
5. Remediation Agent (GitHub) - Apply fix, create PR
6. Ticket Update (Linear) - Update ticket with PR link

## Environment Variables

Required in `.env` (see `.env.example`):
- `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING` - PostgreSQL connection
- `ANTHROPIC_API_KEY` - Claude API
- `VERCEL_TOKEN`, `GITHUB_TOKEN`, `SUPABASE_*`, `LINEAR_API_KEY` - Provider credentials
