# US-06 — Orchestrateur cœur (session Claude par incident)

## Objectif
Implémenter la boucle principale `runner.py` : 1 incident = 1 `ClaudeSDKClient` persistant, machine à états sur `incidents.status`, invocation séquentielle des subagents.

## Périmètre
**Inclus**
- `self_healer/orchestrator/runner.py` :
  - `async def run_incident(incident_id: str, cancellation: CancellationToken)`.
  - Crée le workspace (`workspace.create_workspace`).
  - Instancie `ClaudeSDKClient` en context manager async, avec :
    - `system_prompt` : prompt principal de l'orchestrateur (charge `prompts/orchestrator.md`).
    - `options.agents` : dict des `AgentDefinition` (cf. US-08→US-13, ici on enregistre les placeholders).
    - `options.hooks` : `SessionStart`, `PreToolUse`, `PostToolUse`, `Stop`, `UserPromptSubmit` (US-05).
    - `options.allowed_tools` : ensemble large par défaut, restreint au niveau subagent.
    - `options.cwd` : workspace de l'incident (le sandbox runtime Anthropic est activé via `options.sandbox` si exposé par le SDK).
    - `options.permission_mode` : `acceptAll` côté MVP, les blocages se font via hooks (US-14).
    - `options.model` : `claude-sonnet-4-5` (modèle principal de l'orchestrateur).
  - **Prompt caching** activé sur system prompt + tool defs (option SDK).
  - Machine à états : `pending → collecting → reproducing → fixing → testing → pushing → reporting → done`, transitions via `db.update_status` + event `orchestrator`.
  - Conduit la séquence en envoyant à la session des messages du type "invoque l'agent X avec ce contexte" (`Task` tool), récupère le résultat JSON, log, transition.
  - Awaiting user : si le collector lève une question via `ask_user`, status → `awaiting_user`, on `await` un `asyncio.Event` débloqué par la réponse user (US-07).
  - Cancellation : token `asyncio.Event`. Vérifié entre chaque transition. À l'annulation : ferme proprement le client, déclenche `cleanup` (US-16).
  - Timeout global : `settings.session_timeout_minutes` → si dépassé, status `failed`, raison loggée.
- `self_healer/orchestrator/agents.py` : factory qui construit le dict `{name: AgentDefinition}` à partir des modules d'agents (US-08→13). À ce stade les agents sont des stubs renvoyant `{"status":"ok"}`.
- `self_healer/orchestrator/cancellation.py` : `CancellationToken` (wrapper `asyncio.Event` + helper `raise_if_cancelled`).
- `kick_off_pipeline(incident_id)` (depuis US-04) implémenté ici : lance `asyncio.create_task(run_incident(...))`, conserve la task dans un registre `dict[incident_id, Task]` exposé pour cancellation et inspection.
- Prompt `prompts/orchestrator.md` : décrit la mission (piloter la séquence), interdit toute action métier directe, force le passage par les subagents.

**Out of scope** : implémentation réelle des agents (stories suivantes), garde-fous spécifiques (US-14).

## Dépendances
- US-02, US-03, US-05.

## Critères d'acceptation
- Démarrer un incident via API enchaîne les statuts jusqu'à `done` même si les agents sont des stubs (transitions correctes en DB).
- L'annulation pendant `reproducing` ferme la session et met le statut à `cancelled` en <5 s.
- Le timeout configurable interrompt et met `failed`.
- Les events `started`/`finished` sont émis pour chaque agent stub.
- 2 incidents en parallèle ont chacun leur session indépendante (workspaces et tasks isolés).
