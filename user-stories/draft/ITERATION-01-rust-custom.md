# Itération 1 — Version Rust + boucle agent custom

> Implémente **le même contrat** que `ITERATION-01-overview.md`, mais **sans SDK d'agent** : on réécrit à la main la boucle agentique (tool-use loop) directement sur l'**API Messages** d'Anthropic (`POST /v1/messages`). C'est le cœur de la comparaison avec la version Python.

## 1. Stack
- Rust (édition 2021+), runtime async **tokio**
- **axum** (API REST) + **tower-http** (CORS, multipart)
- **reqwest** (client HTTP vers l'API Anthropic) + **serde / serde_json**
- git + `gh` CLI invoqués via `std::process::Command`
- Store de jobs **en mémoire** : `Arc<RwLock<HashMap<JobId, Job>>>`
- Un job = une `tokio::task`

> Note : il n'existe pas de SDK d'agent Anthropic officiel en Rust. On modélise nous-mêmes les types de l'API Messages (messages, blocs `tool_use` / `tool_result`, `usage`). Des crates communautaires existent pour les **types** de l'API ; on reste néanmoins sur une implémentation **custom** de la boucle pour la valeur comparative (libre d'emprunter des types si ça ne masque pas la boucle).

## 2. Structure
```
backend-rust/
├── Cargo.toml
├── .env.example                 # ANTHROPIC_API_KEY, HEALER_MODEL, HEALER_PORT=8002, HEALER_WORKSPACE_ROOT
├── src/
│   ├── main.rs                  # axum router : /api/health, /api/jobs[...]
│   ├── config.rs
│   ├── models.rs                # Job, JobStatus, Event, Usage (serde)
│   ├── store.rs                 # store en mémoire (Arc<RwLock<…>>)
│   ├── git_ops.rs               # clone, branch, commit, push, gh pr create (déterministe)
│   ├── anthropic.rs             # client API Messages : types + appel reqwest + (option) streaming
│   └── agent/
│       ├── runner.rs            # orchestre les étapes + pilote la boucle
│       ├── agent_loop.rs        # boucle tool-use : messages → tool_use → exécution → tool_result → répète
│       ├── tools.rs             # schémas JSON des tools + exécution (list/read/search/edit/write/submit_fix)
│       └── prompt.rs            # system prompt du correcteur
└── tests/
```

## 3. La boucle agent custom (agent_loop.rs) — cœur de la version Rust
1. Construire la requête initiale : `system` prompt + `messages` (1er user msg = description + contenu du log + arbo) + `tools` (schémas JSON).
2. `POST https://api.anthropic.com/v1/messages` via reqwest (headers `x-api-key`, `anthropic-version`).
3. Lire la réponse :
   - blocs `text` → loggés dans `events`,
   - blocs `tool_use` → **dispatch** vers `tools::execute(name, input)` (lecture/édition fichier dans le workspace), puis renvoyer un message `user` contenant les `tool_result` correspondants,
   - répéter tant que `stop_reason == "tool_use"`.
4. Fin de boucle quand l'agent appelle `submit_fix(...)` (ou `stop_reason == "end_turn"`). On récupère la sortie structurée `{ commit_type, short_description, summary }`.
5. Accumuler `usage.input_tokens` / `output_tokens` à chaque tour → `Job.usage`.

À implémenter **à la main** (ce que le SDK Python offrirait gratuitement) :
- sérialisation des blocs `tool_use` / `tool_result`,
- gestion de `stop_reason`, garde-fou sur le **nombre max de tours** (ex. 25),
- **retries** avec backoff sur 429 / 5xx,
- confinement des tools au workspace (anti path traversal),
- comptage d'usage, gestion d'erreurs typées.

## 4. Tools (tools.rs)
Mêmes tools que la version Python, définis en **schémas JSON** envoyés à l'API :
- `list_files`, `read_file`, `search`, `edit_file` / `write_file`, `submit_fix`.
- Chaque exécution valide que le chemin résolu reste sous `/tmp/healer/<job_id>/repo`.

## 5. Flux d'un job (runner.rs)
Identique à la version Python : `cloning` → boucle agent (`analyzing/editing`) → `committing` (message `"<JIRA-ID> - <type>: <desc>"`) → `opening_pr` (`git push` + `gh pr create --draft`) → `done`. Erreur → `failed` + `error` + `events`.

git/PR via `git_ops.rs` (déterministe) → garantit nom de branche et format de commit.

## 6. Endpoints (axum) — contrat identique
- `GET /api/health` → `{ "backend": "rust-custom", "version": …, "model": … }`
- `POST /api/jobs` (multipart) → `202 { job_id, status }`
- `GET /api/jobs/{id}` → état complet
- `GET /api/jobs` (optionnel) → liste

## 7. Config (.env.example)
```
ANTHROPIC_API_KEY=
HEALER_MODEL=claude-sonnet-4-6
HEALER_PORT=8002
HEALER_WORKSPACE_ROOT=/tmp/healer
HEALER_JOB_TIMEOUT_SECONDS=600
HEALER_MAX_AGENT_TURNS=25
```

## 8. Critères d'acceptation
1. `GET /api/health` renvoie `backend=rust-custom`.
2. **Même scénario** que la version Python sur le **même repo de démo** → job `done`.
3. Branche poussée = `branch_name` exact.
4. Commit `"<JIRA-ID> - <type>: <desc>"` (ex. `JMIA-123 - fix: update authentication`).
5. PR draft ouverte, titre au même format, body = résumé + ticket.
6. L'UI (même front) affiche étapes, tool calls et usage tokens, puis le lien PR.
7. La boucle s'arrête proprement au max de tours sans planter.
8. Un chemin hors workspace est refusé par l'exécuteur de tools.

## 9. Points ouverts spécifiques
- Streaming (`stream: true`, SSE) ou réponse complète ? → réponse complète suffit pour l'itération.
- Emprunter une crate communautaire pour les **types** de l'API Messages, ou tout définir en interne ? (rester custom sur la **boucle**).
- Stratégie de retry/backoff et timeouts reqwest.
- Robustesse du parsing des arguments de tools renvoyés par le modèle.
