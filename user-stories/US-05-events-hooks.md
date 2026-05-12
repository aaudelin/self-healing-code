# US-05 — Streaming events & hooks Agent SDK

## Objectif
Brancher les hooks du Claude Agent SDK pour persister chaque action d'agent et diffuser ces events en temps réel à l'UI.

## Périmètre
**Inclus**
- `self_healer/orchestrator/hooks.py` exposant 5 hooks selon section 12 de la spec :
  - `SessionStart` → event `started` pour l'agent qui démarre.
  - `PreToolUse` → event `tool_use` (tool name, args résumés). Renvoie `block=True` pour les patterns dangereux (logique réelle en US-14, ici juste l'extension point).
  - `PostToolUse` → event `tool_result` (résultat **tronqué à 2000 chars** avant DB).
  - `UserPromptSubmit` → utilisé par le tool `ask_user` (US-07).
  - `Stop` → event `finished`, calcul et `bump_metrics` (tokens in/out, coût via `cost.py` US-14).
- Chaque hook :
  1. Appelle `db.append_event(...)`.
  2. Publie l'event sur un `EventBus` in-memory (asyncio `PubSub` simple : un `dict[incident_id, list[Queue]]`).
- `self_healer/orchestrator/events_bus.py` : bus asyncio (`subscribe`, `unsubscribe`, `publish`), réutilisable par WebSocket.
- `self_healer/api/events.py` :
  - `WS /api/incidents/{id}/events/ws` : à la connexion, envoie le backlog DB (via `since=<connect_ts - 30s>`), puis stream les nouveaux events du bus jusqu'à la fermeture.
  - Heartbeat ping toutes les 15s.
- Masquage des secrets dans les payloads avant persistance/publication : matcher `ANTHROPIC_API_KEY`, `GH_TOKEN`, `JIRA_API_TOKEN`, valeurs depuis settings → remplacer par `***REDACTED***`.

**Out of scope** : règles de blocage métier (US-14), calcul coût (US-14).

## Dépendances
- US-02 (events table), US-04 (app FastAPI).

## Critères d'acceptation
- Un agent stub qui invoque un faux outil produit 1 event `tool_use` + 1 event `tool_result` en DB.
- Le payload `tool_result` en DB ne dépasse jamais 2000 caractères.
- Un client WebSocket reçoit les events en temps réel dans l'ordre.
- Si un secret connu apparaît dans un payload, il est masqué dans la DB et le WS.
- Tests : pub/sub bus, troncature, masquage.
