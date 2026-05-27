# Itération 1 — Version Python + Claude Agent SDK

> Implémente le contrat commun de `ITERATION-01-overview.md`. Ici, on s'appuie au maximum sur le **Claude Agent SDK (Python)** : boucle agent, exécution des tools, hooks et comptage d'usage sont fournis par le SDK.

## 1. Stack
- Python 3.11+
- **FastAPI** (API REST) + **uvicorn**
- **claude-agent-sdk** (Python) — boucle agent, tools, hooks
- `pydantic` / `pydantic-settings` (config & modèles)
- git + `gh` CLI (déjà authentifiés en local) appelés par le backend
- Store de jobs **en mémoire** (dict), protégé par un lock asyncio
- Gestion async : un job = une `asyncio.Task`

## 2. Structure
```
backend-python/
├── pyproject.toml
├── .env.example                 # ANTHROPIC_API_KEY, HEALER_MODEL, HEALER_PORT=8001, HEALER_WORKSPACE_ROOT
├── app/
│   ├── main.py                  # FastAPI : routes /api/health, /api/jobs[...]
│   ├── settings.py
│   ├── models.py                # Job, JobStatus, Event, Usage (pydantic)
│   ├── store.py                 # store de jobs en mémoire
│   ├── git_ops.py               # clone, branch, commit, push, gh pr create (déterministe)
│   └── agent/
│       ├── runner.py            # orchestre les étapes + lance la boucle SDK
│       ├── prompts.py           # system prompt du correcteur
│       ├── tools.py             # submit_fix (custom tool) ; tools fichiers = built-in
│       └── hooks.py             # PreToolUse (confinement workspace) + capture events/usage
└── tests/
```

## 3. Mapping sur le SDK
- **Boucle agent** : `ClaudeSDKClient` (session par job) ou `query()` avec `ClaudeAgentOptions`.
- **Tools fichiers** : built-in `Read`, `Glob`, `Grep`, `Edit`, `Write` du SDK, restreints au workspace.
- **Tool de sortie** : custom tool `submit_fix(commit_type, short_description, summary)` qui clôt la boucle avec la sortie structurée.
- **System prompt** : rôle « correcteur », reçoit description + contenu du log + arbo du repo ; consigne de produire un **correctif minimal** puis d'appeler `submit_fix`.
- **Pas de Bash exposé** : git/PR faits par `git_ops.py` (cf. décision actée dans l'overview §2).
- **Hooks** :
  - `PreToolUse` : bloque tout accès fichier hors `/tmp/healer/<job_id>/repo` ; masque d'éventuels secrets.
  - `PostToolUse` / messages : alimente `events` (niveau `tool`) du job.
  - usage tokens récupéré depuis les messages/résultat du SDK → `Job.usage`.
- **Prompt caching** : activé sur system prompt + définitions de tools (gain coût/latence).

## 4. Flux d'un job (runner.py)
1. `POST /api/jobs` → crée `Job(status=queued)`, stocke inputs + log sur disque, lance `asyncio.create_task(run(job))`.
2. `run()` : `cloning` → `git_ops.clone_and_branch()`.
3. `analyzing/editing` → ouvre la session SDK avec le contexte ; laisse l'agent lire/éditer ; collecte la sortie de `submit_fix`.
4. `committing` → `git_ops.commit(f"{jira_ticket_id} - {commit_type}: {short_description}")`.
5. `opening_pr` → `git_ops.push_and_pr(branch_name, title=commit_message, body=summary+ticket)`.
6. `done` → renseigne `result`. Toute exception → `failed` + `error` + trace dans `events`.

## 5. Endpoints
- `GET /api/health` → `{ "backend": "python-sdk", "version": …, "model": … }`
- `POST /api/jobs` (multipart) → `202 { job_id, status }`
- `GET /api/jobs/{id}` → état complet (cf. overview §5)
- `GET /api/jobs` (optionnel) → liste

## 6. Config (.env.example)
```
ANTHROPIC_API_KEY=
HEALER_MODEL=claude-sonnet-4-6
HEALER_PORT=8001
HEALER_WORKSPACE_ROOT=/tmp/healer
HEALER_JOB_TIMEOUT_SECONDS=600
```

## 7. Critères d'acceptation
1. `GET /api/health` renvoie `backend=python-sdk`.
2. Sur un repo de démo avec un bug simple (ex. null check manquant), un job va jusqu'à `done`.
3. La branche poussée porte **exactement** `branch_name`.
4. Le commit est `"<JIRA-ID> - <type>: <desc>"` (ex. `JMIA-123 - fix: update authentication`).
5. Une **PR draft** est ouverte ; son titre suit le même format, le body contient le résumé + le ticket.
6. L'UI affiche étapes, tool calls et usage tokens, puis le lien PR.
7. Un chemin hors workspace est refusé par le hook `PreToolUse`.

## 8. Points ouverts spécifiques
- `ClaudeSDKClient` (session persistante) vs `query()` one-shot — au plus simple pour l'itération.
- Récupération fine de l'usage tokens selon la version du SDK.
- Forme exacte de la sortie : custom tool `submit_fix` vs parsing du dernier message structuré.
