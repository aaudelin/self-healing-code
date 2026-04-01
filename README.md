# AIOps Self-Healing Pipeline

An AI-powered platform that automatically detects and fixes application errors. It connects to your Vercel logs, GitHub repository, Supabase database, and Linear workspace to orchestrate a self-healing workflow: fetch errors, analyze root causes with AI, create tickets, and open pull requests with fixes.

## Local Setup

**Prerequisites**: Node.js 20+, pnpm 9+, Docker

```bash
# 1. Install dependencies
pnpm install

# 2. Start PostgreSQL
docker compose up -d

# 3. Configure environment
cp .env.example .env
# Edit .env with your API keys (Anthropic, Vercel, GitHub, Supabase, Linear)

# 4. Setup database
pnpm db:generate
pnpm db:push

# 5. Run development servers
pnpm dev
```

The web app runs on http://localhost:3000 and the API on http://localhost:4000.
