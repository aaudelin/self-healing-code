# Itération 1 — Overview & cadrage commun

> Première itération. Objectif : valider, sur **un cas simple**, deux implémentations d'un même agent correcteur, derrière **un front unique**. Les itérations suivantes viendront enrichir ces mêmes bases (features additionnelles).
> Doc de référence amont : `MVP-01.md` (spec complète). Ici on **réduit volontairement** le périmètre et on **challenge** plusieurs choix de la spec (voir §2).

## 1. Objectif de l'itération

Construire un agent qui, à partir de :

- un **fichier de log** (texte),
- une **description de tâche**,
- un **lien GitHub** du repo à modifier,
- un **nom de branche**,
- un **ID de ticket Jira**,

produit une **PR corrective** sur le repo : il analyse log + description + code, applique un correctif, puis ouvre une PR draft sur la branche fournie.

Les deux versions implémentent **exactement le même comportement et le même contrat d'API**, mais diffèrent par le backend :

| Version | Langage | Couche agent |
|---|---|---|
| **Version Python** | Python | **Claude Agent SDK** (batteries incluses : boucle agent, tools, hooks, usage) |
| **Version Rust** | Rust | **Implémentation custom** de la boucle agent directement sur l'**API Messages** d'Anthropic |

Le but réel de l'itération est **comparatif** : mesurer effort de dev, contrôle, perf et DX du SDK Python vs une boucle agentique réécrite à la main en Rust (voir §8). Le front, identique, sert à exécuter le même scénario contre les deux backends via une simple config.

## 2. Ce qu'on garde / ce qu'on challenge vs `MVP-01.md`

| Sujet MVP-01 | Décision itération 1 | Raison |
|---|---|---|
| Pipeline 7 agents (collector → reproducer → fixer → tester → pr → reporter) | **1 seul agent** correcteur | Cas simple ; le multi-agent n'apporte rien à l'itération 1 |
| Reproduction Docker, ports dynamiques | **Supprimé** | Scope = édition + PR, pas d'exécution de l'app |
| Tester / suite de tests / lint avant PR | **Hors scope** | Confirmé : édition + PR uniquement |
| Score de confiance, rubrique | **Supprimé** | Pas de validation exécutée → non pertinent ici |
| Q&A agent ↔ user | **Supprimé** | Cas simple, flux linéaire |
| Persistance SQLite (5 tables) | **Store en mémoire** + fichiers sur disque | Suffisant pour cette itération ; rien ne survit à un restart (assumé) |
| Format commit | **`JIRA-ID - type: desc`** (ex. `JMIA-123 - fix: update authentication`) | Format de référence. `MVP-01.md` a été mis à jour pour s'aligner. |
| UI Streamlit | **Next.js** | Front strictement découplé du langage backend, donc réutilisable tel quel |
| Sandbox runtime Anthropic | **Confinement applicatif simple** (tools fichiers limités au workspace) | Pas de Bash exposé à l'agent → surface réduite, sandbox lourd non nécessaire |

### Décision actée — qui fait les opérations git ?

**Le backend fait le git/PR de façon déterministe ; l'agent ne fait que le raisonnement + les éditions de fichiers.**

- Les exigences **dures** (nom de branche exact, préfixe ticket + conventional commit) ne dépendent **pas** de la docilité du LLM → codées en dur dans le backend.
- L'agent renvoie une sortie structurée `{ commit_type, short_description, summary }` ; le backend construit le message de commit `"<JIRA-ID> - <type>: <short_description>"`, commit, push et `gh pr create`.
- Bonus : **parité** plus simple entre Python et Rust (la valeur comparée reste la boucle agentique elle-même, pas le plumbing git).

## 3. Périmètre

### Inclus
- Front Next.js unique, pointant vers un backend via config (`NEXT_PUBLIC_BACKEND_URL`)
- Contrat d'API REST commun (§5)
- Agent correcteur : clone → branche → édition → commit → push → PR draft
- Respect strict du nom de branche et du format de commit
- Trace d'événements (tool calls, étapes) consultable dans l'UI
- Usage tokens approximatif par job

### Hors périmètre (itération 1)
- Build / lint / tests / reproduction
- Docker, multi-stack (seul du code « éditable » est visé)
- Multi-agent, Q&A, score de confiance
- Auth utilisateur, multi-tenant, persistance durable
- Webhooks, intégration Jira au-delà du simple préfixe de commit

## 4. Front commun (Next.js)

- App Next.js (App Router) **agnostique du backend**. La cible est choisie par `NEXT_PUBLIC_BACKEND_URL` (ex. `http://localhost:8001` pour Python, `http://localhost:8002` pour Rust).
- Au chargement, le front appelle `GET /api/health` et **affiche quel backend** répond (`python-sdk` / `rust-custom`) + le modèle utilisé.

### Écrans
1. **Nouveau traitement** — formulaire :
   - `repo_url` (URL GitHub, validation regex `https://github.com/<owner>/<repo>`)
   - `branch_name` (validation kebab-case)
   - `jira_ticket_id` (ex. `JMIA-123`)
   - `description` (textarea)
   - `log_file` (upload `.txt`/`.log`, ≤ 5 MB, **optionnel**)
   - bouton « Lancer »
2. **Suivi du job** — après `POST /api/jobs`, le front poll `GET /api/jobs/{id}` toutes les ~2s :
   - statut + étape courante (badge)
   - timeline des `events` (étapes, tool calls)
   - usage tokens
   - à la fin : lien **PR**, message de commit, résumé du correctif ; ou erreur si `failed`
3. **Historique** (optionnel, minimal) — liste des jobs de la session via `GET /api/jobs`.

Aucune logique métier dans le front : il ne fait qu'orchestrer formulaire + polling + affichage.

## 5. Contrat d'API REST commun (les deux backends l'implémentent à l'identique)

Base path : `/api`. Réponses JSON, CORS ouvert en local.

### `GET /api/health`
```json
{ "backend": "python-sdk", "version": "0.1.0", "model": "claude-sonnet-4-6" }
```

### `POST /api/jobs`  (multipart/form-data)
Champs : `repo_url`, `branch_name`, `jira_ticket_id`, `description` (requis), `log_file` (fichier, **optionnel** — on peut lancer avec la seule description).
→ `202`
```json
{ "job_id": "f3c1...", "status": "queued" }
```

### `GET /api/jobs/{id}`
```json
{
  "job_id": "f3c1...",
  "status": "queued | running | done | failed",
  "current_step": "cloning | analyzing | editing | committing | opening_pr | null",
  "created_at": "2026-05-27T10:00:00Z",
  "updated_at": "2026-05-27T10:00:42Z",
  "inputs": {
    "repo_url": "https://github.com/owner/repo",
    "branch_name": "fix/login-npe",
    "jira_ticket_id": "JMIA-123",
    "description": "…",
    "log_filename": "prod.log"
  },
  "result": {
    "pr_url": "https://github.com/owner/repo/pull/42",
    "commit_message": "JMIA-123 - fix: update authentication",
    "summary": "## Résumé\n…"
  },
  "error": null,
  "events": [
    { "ts": "…", "level": "info",  "message": "clone ok" },
    { "ts": "…", "level": "tool",  "message": "read_file src/auth.ts" }
  ],
  "usage": { "input_tokens": 12000, "output_tokens": 2300 }
}
```
`result` et `usage` sont `null` tant que le job n'est pas `done`. `error` non-null si `failed`.

### `GET /api/jobs`  (optionnel)
Liste des jobs de la session (mêmes objets, sans le détail des `events`).

## 6. Comportement de l'agent (logique partagée, implémentation différente)

Étapes orchestrées par le backend (déterministe), avec l'agent au cœur de l'étape « analyse + édition » :

1. **queued** → création du workspace `/tmp/healer/<job_id>/`, sauvegarde du log.
2. **cloning** → `git clone <repo_url> repo` puis `git checkout -b <branch_name>`.
3. **analyzing/editing** → **boucle agent** : on fournit au modèle la `description`, le **contenu du log**, et l'accès au repo via des tools. L'agent localise et corrige le problème.
4. **committing** → le backend construit `"<JIRA-ID> - <type>: <desc>"`, `git add -A && git commit`.
5. **opening_pr** → `git push -u origin <branch_name>` puis `gh pr create --draft` (titre = message de commit, body = `summary` + `Ticket: <JIRA-ID>`).
6. **done** → renvoie `pr_url`, `commit_message`, `summary`.

### Surface d'outils exposée à l'agent (identique aux deux versions)
- `list_files(path?, glob?)`
- `read_file(path)`
- `search(query)` (grep)
- `edit_file(path, ...)` / `write_file(path, content)`
- `submit_fix(commit_type, short_description, summary)` — termine la boucle et renvoie la sortie structurée

> Tous les chemins sont **confinés au workspace** ; toute tentative d'en sortir est rejetée. Pas de Bash exposé à l'agent.

### Modèles
- Défaut : `claude-sonnet-4-6` (configurable via env `HEALER_MODEL`).
- Bascule possible `claude-opus-4-7` pour les correctifs complexes.
- À vérifier au 1er run : disponibilité des IDs de modèle via l'API.

## 7. Sécurité & garde-fous (minimal pour cette itération)
- Validation stricte `repo_url` (GitHub https uniquement ; refus `file://`, ssh, autres hôtes).
- Tools fichiers bornés au workspace (anti path traversal).
- `gh`/`git` supposés authentifiés sur la machine ; tokens jamais loggés dans `events`.
- Limite taille log (5 MB). Timeout global de job configurable (défaut 10 min).

## 8. Critères de comparaison (à remplir après implémentation)

| Dimension | Version Python (SDK) | Version Rust (custom) |
|---|---|---|
| LOC / effort pour atteindre la parité | | |
| Latence bout-en-bout (même job) | | |
| Mémoire / taille binaire / footprint déploiement | | |
| Contrôle de la boucle (retries, streaming, hooks, garde-fous) | | |
| Observabilité (usage tokens, events, debug) | | |
| Maturité écosystème / dépendances | | |
| Developer experience | | |

## 9. Points ouverts
- Faut-il un endpoint `GET /api/jobs` (historique) ou suivi mono-job suffisant pour cette itération ?
- Streaming temps réel (SSE) plus tard, ou polling 2s suffit ? (proposé : polling)
