# AIOps Self-Healing Pipeline — MVP Functional Specification

## Overview

This document describes the functional specification for the MVP of an AIOps self-healing pipeline platform. The product allows users to configure and manually trigger automated incident detection and remediation pipelines. It connects to external services (logs, code repositories, databases, ticketing, documentation) and orchestrates a sequence of AI agents to analyze, document, and fix detected errors.

The MVP is intentionally scoped: no authentication, no scheduled runs, no multi-tenant isolation. The goal is to demonstrate a working end-to-end self-healing pipeline that can later be extended into a production-grade product.

---

## Core Concepts

### Pipeline

A pipeline is the central entity of the product. It represents a configured, reusable workflow that connects a set of external services and, when triggered, executes a sequence of steps to detect, analyze, and remediate application errors.

Each pipeline belongs to a single project context and is configured once, then run on demand.

### Pipeline Run

A pipeline run is a single execution of a pipeline. Each run is recorded with its status, start time, end time, and a structured log of all steps. Runs are immutable once completed.

### Step

A run is composed of sequential steps. Each step represents a discrete unit of work (e.g., fetching logs, cloning the repository, running an agent). Steps have a status (pending, running, success, failed, skipped) and produce structured output that is passed to subsequent steps.

---

## Features

### 1. Pipeline Management

#### 1.1 Create a Pipeline

The user can create a new pipeline by providing:

- **Name**: a human-readable label for the pipeline.
- **Description** *(optional)*: a short summary of what this pipeline monitors and repairs.

Once created, the pipeline is in a draft state until all required integrations are configured.

#### 1.2 Configure Pipeline Integrations

After creation, the user configures the external services the pipeline will use. Each integration is configured independently. For the MVP, the available integration types are fixed:

| Integration Role | MVP Provider |
|---|---|
| Log source | Vercel |
| Code repository | GitHub |
| Database | Supabase |
| Ticketing | Linear |

Each integration requires the user to provide credentials or tokens specific to that provider, as well as provider-specific targeting parameters (e.g., which Vercel project, which GitHub repository, which Linear team).

All credentials are stored at the pipeline level and are not shared across pipelines.

#### 1.3 Pipeline List View

The user can view all created pipelines on a dashboard. For each pipeline, the list shows:

- Pipeline name and description
- Configuration status (whether all required integrations are configured)
- Last run status and timestamp (or "Never run" if no run exists)
- A shortcut to trigger a new run

#### 1.4 Pipeline Detail View

The user can open a pipeline to view its full detail, including:

- All configured integrations and their current status
- The history of all past runs, sorted by most recent first
- Each run's summary status, timestamps, and a link to the run detail

#### 1.5 Edit a Pipeline

The user can edit the name, description, and integration configuration of an existing pipeline at any time, as long as no run is currently in progress.

#### 1.6 Delete a Pipeline

The user can delete a pipeline. Deleting a pipeline also deletes all associated run history.

---

### 2. Pipeline Execution

#### 2.1 Manual Trigger

The user triggers a pipeline run manually from either the pipeline list or the pipeline detail view. There are no scheduled or event-driven triggers in the MVP.

Upon triggering, a new run is created immediately and the user is redirected to the run detail view, where they can follow the execution in real time.

#### 2.2 Run Detail View

The run detail view shows:

- Overall run status (running, success, failed, partially failed)
- Start time, end time, total duration
- A step-by-step breakdown of the execution, each showing:
    - Step name
    - Status
    - Duration
    - Structured output or error message

The view updates in real time while the run is in progress.

#### 2.3 Execution Steps

A pipeline run executes the following steps in order. If any step fails, the run is marked as failed and subsequent steps are skipped, unless otherwise noted.

---

##### Step 1 — Log Ingestion (Vercel)

The system connects to the Vercel API using the credentials provided in the pipeline configuration and retrieves recent runtime logs for the configured project and environment.

The system filters logs to identify error-level entries. If no errors are found, the run is marked as completed with a "no errors detected" status, and subsequent steps are skipped.

If errors are found, they are collected and passed to the next step.

**Output**: A structured list of error events, each containing the error message, timestamp, and any available stack trace or contextual metadata from Vercel.

---

##### Step 2 — Repository Clone (GitHub)

The system clones the configured GitHub repository to a temporary local workspace. The clone targets the default branch unless otherwise specified in the pipeline configuration.

The workspace is isolated per run and cleaned up after the run completes.

**Output**: A local copy of the codebase, ready for analysis and modification.

---

##### Step 3 — Database Schema Inspection (Supabase)

The system connects to the configured Supabase project and retrieves the database schema: the list of tables, their columns, types, constraints, and relationships. This context is passed to the analysis agent to allow it to reason about database-related errors.

**Output**: A structured representation of the database schema.

---

##### Step 4 — Analysis Agent (Linear)

An AI agent receives the following inputs:
- The error events collected in Step 1
- The codebase (file tree and relevant files identified from stack traces)
- The database schema from Step 3

The agent performs a root cause analysis and produces a structured report containing:
- A summary of each detected error
- The identified root cause(s)
- The files and lines of code involved
- The database tables or queries involved, if applicable
- A proposed remediation strategy
- A confidence level (high / medium / low) for the proposed fix

The agent then creates a ticket in the configured Linear team with this report as the ticket description. The ticket is tagged with a label that identifies it as AI-generated.

**Output**: The analysis report and the URL of the created Linear ticket.

---

##### Step 5 — Remediation Agent (GitHub)

A second AI agent receives:
- The analysis report from Step 4
- The local codebase from Step 2

The agent evaluates whether the proposed fix is safe to implement automatically, based on the confidence level and the nature of the change. If the confidence level is low or the change is too broad (e.g., affects more than a configurable threshold of files), the agent skips implementation and logs its reasoning.

If implementation proceeds, the agent:
1. Creates a new branch in the local repository. The branch name is derived from the Linear ticket identifier created in Step 4.
2. Applies the code changes.
3. Commits the changes with a structured commit message referencing the ticket.
4. Pushes the branch to the remote GitHub repository.
5. Opens a pull request on GitHub targeting the default branch. The PR description includes a summary of the changes and a reference to the Linear ticket.

**Output**: The URL of the created GitHub pull request, or a skip reason if no implementation was performed.

---

##### Step 6 — Ticket Update (Linear)

The system updates the Linear ticket created in Step 4 with:
- The URL of the GitHub pull request (if one was created)
- A status update reflecting the outcome of the remediation step
- The overall run status

**Output**: Confirmation of the ticket update.

---

### 3. Run History

The user can browse the full history of runs for any pipeline. Runs are displayed in reverse chronological order with their status, duration, and a link to the run detail view.

Old runs are retained indefinitely in the MVP (no purge policy).

---

### 4. Settings

A global settings page allows the user to view and update application-level configuration. In the MVP, this is limited to managing default values or global API keys that apply across pipelines (if applicable).

---

## Data Model (Functional Description)

### Pipeline

Stores all information about a configured pipeline, including its name, description, integration credentials, and metadata such as creation date and last modified date.

### Pipeline Integration

Each pipeline has a set of associated integrations, one per role (logs, repository, database, ticketing). Each integration stores the provider type, the credentials, and the provider-specific targeting parameters.

### Pipeline Run

Each run is associated with a pipeline and stores the overall status, start time, end time, and a reference to the ordered list of steps.

### Run Step

Each step is associated with a run and stores the step name, order index, status, start time, end time, and structured output (as a JSON blob). Error messages are stored inline when a step fails.

---

## UI Structure

### Pages

| Route | Description |
|---|---|
| `/` | Dashboard — list of all pipelines |
| `/pipelines/new` | Create pipeline form |
| `/pipelines/[id]` | Pipeline detail — integrations + run history |
| `/pipelines/[id]/edit` | Edit pipeline configuration |
| `/pipelines/[id]/runs/[runId]` | Run detail — real-time step execution view |
| `/settings` | Global settings |

### Key UI Behaviors

- The dashboard provides a quick overview with status badges and a one-click trigger button per pipeline.
- The pipeline detail page uses a tabbed or sectioned layout: one section for configuration, one for run history.
- The run detail page displays steps as a vertical timeline, updating in real time. Each step can be expanded to show its full output.
- Credential fields in the integration configuration forms are masked by default (password-type input) and support reveal-on-demand.
- Destructive actions (delete pipeline, etc.) require a confirmation dialog.
- Empty states (no pipelines, no runs) are informative and guide the user toward the next action.

---

## Agent Behavior Guidelines

### LLM Integration

Both agents are implemented as NestJS services that call the Anthropic API directly using the `@anthropic-ai/sdk` package. The model used is `claude-sonnet-4-6`. Each agent constructs its own prompt, sends a single request (or a multi-turn conversation if iterative reasoning is required), and parses the response into a structured output before passing it to the next step.

The Anthropic API key is stored as an environment variable and is never exposed to the frontend.

### General

Both agents (analysis and remediation) must operate within the context they are given and must not make assumptions about code they have not been provided. They must cite specific files and line numbers in their outputs.

### Analysis Agent

- Must produce a structured, machine-readable report in addition to the human-readable ticket description.
- Must clearly separate confirmed findings from hypotheses.
- Must not propose fixes that involve changes to infrastructure, environment variables, or configuration files outside the repository.

### Remediation Agent

- Must never force-push to protected branches.
- Must never modify more files than a configurable maximum per run (default: 10 files in the MVP).
- Must include tests for the fix if the repository contains an existing test suite and the fix is testable.
- Must skip implementation and log the reason if the confidence level from the analysis report is "low".
- All commits must follow conventional commit format.

---

## Error Handling

- If an integration is misconfigured (invalid credentials, unreachable service), the corresponding step fails with a clear error message indicating which integration failed and why.
- If the Vercel log API returns no errors, the run completes with a "clean" status — this is not treated as an error.
- If the GitHub push fails (e.g., due to branch protection rules), the step is marked as failed and the Linear ticket is updated with an explanation.
- Agent failures (timeout, LLM error, unparseable output) cause the step to fail. The run is marked as partially failed if Step 4 succeeded before Step 5 or 6 failed.

---

## Out of Scope for MVP

The following features are explicitly excluded from the MVP and are documented here for future reference:

- User authentication and multi-user access
- Scheduled or event-driven pipeline triggers (cron, webhooks)
- Support for providers other than Vercel, GitHub, Supabase, and Linear
- Documentation integration (e.g., Notion, Confluence)
- Notifications (email, Slack, etc.)
- Pipeline versioning
- Agent feedback loop (human approval before applying a fix)
- White-label or multi-tenant support
- Billing or usage metering

---

## Technology Stack

| Layer | Choice |
|---|---|
| Monorepo | Turborepo |
| Package manager | pnpm |
| Frontend framework | Next.js (App Router) |
| Frontend language | TypeScript |
| UI components | shadcn/ui |
| CSS | Tailwind CSS |
| Backend framework | NestJS |
| Backend language | TypeScript |
| Schema validation | Zod |
| API layer | tRPC |
| Database | Supabase (PostgreSQL) |
| Local development | Docker + Docker Compose |
| Deployment | Vercel (frontend + backend) |
| LLM provider | Anthropic API (`claude-sonnet-4-6`) |