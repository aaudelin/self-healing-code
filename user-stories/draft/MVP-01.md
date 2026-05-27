# Spec MVP — Self-Healing Software Agent

## 1. Contexte et objectif

On construit un MVP local d'un système d'agents Claude qui prend en entrée un incident logiciel (bug) et automatise le cycle complet : compréhension, reproduction, correctif, tests, PR draft, rapport.

Stack cible des projets clients : **TypeScript / Next.js / Nest.js dans un monorepo turborepo**.

L'objectif du MVP est de valider la faisabilité technique et l'ergonomie utilisateur, pas la scalabilité ni le multi-tenant. Tout tourne en local.

## 2. Contraintes techniques

- **Exécution** : 100% locale sur la machine du dev
- **Langage** : Python 3.11+
- **Orchestration IA** : Claude Agent SDK (Python) en mode `ClaudeSDKClient` session persistante par incident
- **Authentification Anthropic** : clé API (`ANTHROPIC_API_KEY` via fichier `.env`)
- **Modèles** : choisis par agent en fonction de la complexité (cf. section 6)
- **Persistance** : SQLite (fichier local)
- **UI** : web légère, Streamlit ou FastAPI + petit front (au choix de l'implémenteur, voir section 9)
- **Containerisation cible** : Docker engine local pour les envs de repro (pas l'app elle-même)
- **Sandbox de l'agent** : `@anthropic-ai/sandbox-runtime` activé pour confiner l'agent à un répertoire de travail par incident
- **Git/GitHub** : la CLI `gh` doit être installée et authentifiée sur la machine hôte
- **Jira** : intégration optionnelle pour le MVP, via API REST Atlassian si le ticket ID est fourni (sinon le rapport est juste stocké en local et ajouté à la PR)

## 3. Périmètre fonctionnel du MVP

### Inclus
- Création et suivi d'incidents via UI
- Pipeline complet d'agents : collecte → repro → fix → tests → PR → rapport
- Une session persistante Claude par incident
- Annulation manuelle d'une session
- Q&A avec l'agent collecte si besoin de précisions
- Historique des incidents avec statuts et métriques

### Hors périmètre
- Multi-utilisateurs, auth, rôles
- Déploiement cloud ou conteneurisation de la solution elle-même
- Intégration webhook Jira / Sentry / Datadog (déclenchement automatique)
- Support de stacks autres que TS/Next/Nest/turborepo
- Stratégie de repli si l'agent boucle indéfiniment (au-delà d'un timeout simple)
- Replay de bugs depuis traces OpenTelemetry, dump de prod

## 4. Architecture haut niveau

```
┌──────────────────────────────────────────────────────────┐
│ Frontend (Streamlit ou FastAPI+HTMX)                     │
│  - Création incident                                     │
│  - Liste / détail / Q&A / annulation                     │
└────────────────────────┬─────────────────────────────────┘
                         │ HTTP/WebSocket
┌────────────────────────▼─────────────────────────────────┐
│ Backend Python (FastAPI)                                 │
│  - REST API incidents                                    │
│  - Queue async (asyncio + tasks dict)                    │
│  - Persistance SQLite                                    │
│  - Streaming events (logs agents) via WebSocket ou SSE   │
└────────────────────────┬─────────────────────────────────┘
                         │ pilote
┌────────────────────────▼─────────────────────────────────┐
│ Orchestrateur d'incident (1 par incident)                │
│  - ClaudeSDKClient session persistante                   │
│  - Définit les subagents (collecte, repro, fix, ...)     │
│  - Hooks PreToolUse/PostToolUse → SQLite + WebSocket     │
│  - Annulation via CancellationToken                      │
└────────────────────────┬─────────────────────────────────┘
                         │ tool use
┌────────────────────────▼─────────────────────────────────┐
│ Local execution                                          │
│  - Workspace temporaire /tmp/healer/<incident_id>/       │
│  - Clone repo + git worktree par incident                │
│  - Docker engine (containers de l'env du client)         │
│  - gh CLI (PR), git CLI (commits/push)                   │
└──────────────────────────────────────────────────────────┘
```

### Principes d'isolation
- **Sandbox runtime Anthropic** : confine l'agent au répertoire `/tmp/healer/<incident_id>/` et aux hosts allowlist (api.anthropic.com, github.com, registry.npmjs.org, hub.docker.com…)
- **Docker** : isole l'environnement applicatif du client (DB, services, app under test)
- **Ports dynamiques** : tous les ports exposés par les containers sont alloués dynamiquement (laisser Docker assigner ou utiliser une lib Python comme `socket.bind(('', 0))` pour découvrir un port libre) et passés en variables d'env au container

## 5. Modèle de données (SQLite)

### Table `incidents`
| Colonne | Type | Description |
|---|---|---|
| id | TEXT (UUID) PK | Identifiant unique |
| created_at | TIMESTAMP | Date de création |
| updated_at | TIMESTAMP | Dernière màj |
| status | TEXT | `pending`, `collecting`, `reproducing`, `fixing`, `testing`, `pushing`, `reporting`, `done`, `failed`, `cancelled`, `awaiting_user` |
| branch_name | TEXT | Nom de la branche cible (input user) |
| repo_url | TEXT | URL du repo GitHub à cloner |
| title | TEXT | Titre de l'incident |
| description | TEXT | Description initiale |
| jira_ticket_id | TEXT NULL | Préfixe pour conventional commits / PR |
| pr_url | TEXT NULL | URL de la PR draft une fois créée |
| confidence_score | REAL NULL | Score 0-1 calculé en fin de pipeline |
| total_tokens_input | INTEGER | Cumul tokens input |
| total_tokens_output | INTEGER | Cumul tokens output |
| total_cost_usd | REAL | Coût estimé en USD |
| started_at | TIMESTAMP NULL | Début du pipeline |
| ended_at | TIMESTAMP NULL | Fin du pipeline |
| workspace_path | TEXT | Chemin du workspace local |

### Table `incident_attachments`
| Colonne | Type | Description |
|---|---|---|
| id | INTEGER PK | |
| incident_id | TEXT FK | |
| filename | TEXT | Nom original |
| stored_path | TEXT | Chemin local de stockage |
| description | TEXT | Description fournie par l'user (ex: "logs prod du 12 mai") |
| kind | TEXT | `log`, `dump`, `screenshot`, `trace`, `other` (libre champ texte) |

### Table `agent_events`
Trace fine pour debugging et UI.

| Colonne | Type | Description |
|---|---|---|
| id | INTEGER PK | |
| incident_id | TEXT FK | |
| timestamp | TIMESTAMP | |
| agent_name | TEXT | `collector`, `reproducer`, `fixer`, `tester`, `pr`, `reporter` ou `orchestrator` |
| event_type | TEXT | `started`, `tool_use`, `tool_result`, `message`, `finished`, `failed`, `question_asked` |
| payload | TEXT (JSON) | Détail de l'événement (tool name, args, result tronqué…) |
| tokens_input | INTEGER NULL | |
| tokens_output | INTEGER NULL | |

### Table `incident_qa`
Pour les questions de l'agent collecte à l'utilisateur.

| Colonne | Type | Description |
|---|---|---|
| id | INTEGER PK | |
| incident_id | TEXT FK | |
| asked_at | TIMESTAMP | |
| question | TEXT | |
| answered_at | TIMESTAMP NULL | |
| answer | TEXT NULL | |

### Table `incident_reports`
Le rapport final structuré.

| Colonne | Type | Description |
|---|---|---|
| incident_id | TEXT PK FK | |
| summary | TEXT | Synthèse exécutive |
| root_cause | TEXT | Analyse de la root cause |
| fix_description | TEXT | Ce qui a été modifié et pourquoi |
| reproduction_steps | TEXT | Comment le bug a été reproduit |
| validation_steps | TEXT | Comment le fix a été validé |
| confidence_score | REAL | Score 0-1 |
| confidence_rationale | TEXT | Justification du score |
| markdown_full | TEXT | Version markdown complète pour la PR |

## 6. Spécification des agents

Tous les agents sont définis comme `AgentDefinition` dans l'options de l'orchestrateur principal. L'orchestrateur est un agent principal léger qui pilote la séquence.

### Orchestrateur principal
- **Modèle** : `claude-sonnet-4-5` (raisonnement de pilotage léger)
- **Rôle** : décide quel subagent appeler à chaque étape, gère les transitions de statut, capture les erreurs
- **Outils** : `Task` (pour invoquer les subagents), `Read` (sur les rapports intermédiaires)

### Agent `collector`
- **Modèle** : `claude-sonnet-4-5`
- **Rôle** : lit tous les inputs (description, attachments), produit une **synthèse structurée** de l'incident, identifie les ambiguïtés et **pose des questions à l'utilisateur** via un custom tool `ask_user`
- **Critère de sortie** : produit un JSON `{summary, hypothesized_area, repro_hints, open_questions: []}` et n'avance que si `open_questions` est vide
- **Outils** : `Read`, `Grep`, custom tool `ask_user`
- **Fin** : passe la synthèse à l'orchestrateur

### Agent `reproducer`
- **Modèle** : `claude-sonnet-4-5` (peut basculer en Opus si la repro échoue 2 fois)
- **Rôle** :
  1. Clone le repo dans `/tmp/healer/<incident_id>/repo` via `git clone`
  2. Crée la branche cible (`branch_name` fournie par l'user)
  3. Analyse la config du projet : `package.json`, `turbo.json`, `docker-compose*.yml`, `Dockerfile*`, `.env.example`, `README.md`
  4. Construit ou réutilise un `docker-compose` pour spin l'env applicatif **avec ports dynamiques** (ne jamais utiliser de port fixe susceptible de conflit)
  5. Tente de reproduire le bug en suivant les `repro_hints` du collector
  6. Marque le résultat : `reproduced` / `partially_reproduced` / `not_reproduced`
- **Impact sur confidence_score** :
  - `reproduced` : pas d'impact négatif
  - `partially_reproduced` : score plafonné à 0.6
  - `not_reproduced` : score plafonné à 0.3, l'agent fix doit être prévenu et doit produire un fix défensif (commenté comme tel)
- **Outils** : `Bash` (git, docker, curl), `Read`, `Write`, `Edit`, `Glob`, `Grep`, `WebFetch` (pour repro browser-based si pertinent)
- **Note** : la reproduction browser via Playwright headless est un nice-to-have, à scoper en V2 si non trivial

### Agent `fixer`
- **Modèle** : `claude-opus-4-7` (raisonnement complexe sur du code)
- **Rôle** :
  1. Reçoit la synthèse, la repro, et l'accès au workspace
  2. Analyse les conventions du projet : style, patterns, structure, lint config (`eslint`, `prettier`, `biome`)
  3. Propose et applique un correctif minimal
  4. Lance le linter et le formatter du projet
  5. **Boucle avec le reproducer** : signale à l'orchestrateur que le fix est prêt, le reproducer relance l'env avec le nouveau code, vérifie que le bug ne se reproduit plus
  6. Si le bug persiste : nouvelle itération (max 3 itérations fix↔repro avant abandon)
- **Outils** : `Read`, `Edit`, `Write`, `Bash`, `Glob`, `Grep`, `Task` (pour invoquer le reproducer en validation)

### Agent `tester`
- **Modèle** : `claude-sonnet-4-5`
- **Rôle** :
  1. Identifie les tests existants couvrant la zone modifiée
  2. Met à jour les tests existants si la sémantique a changé
  3. **Ajoute un test qui aurait dû détecter le bug initial** (test rouge avant fix → vert après fix, idéalement validé en lançant le test sur le code pré-fix puis post-fix)
  4. Lance la suite de tests complète et vérifie qu'elle passe
- **Outils** : `Read`, `Edit`, `Write`, `Bash`, `Glob`, `Grep`

### Agent `pr`
- **Modèle** : `claude-haiku-4-5` (tâche essentiellement mécanique)
- **Rôle** :
  1. Analyse les 20 derniers commits sur la branche par défaut pour extraire le pattern (conventional commit, scopes utilisés, formulation)
  2. Compose un commit message respectant : `<JIRA-ID> - <type>: <description>` (ex. `JMIA-123 - fix: update authentication`), ou `<type>: <description>` si pas de Jira ID
  3. `git add . && git commit && git push -u origin <branch_name>`
  4. `gh pr create --draft` avec un titre suivant le même pattern
- **Outils** : `Bash`, `Read`

### Agent `reporter`
- **Modèle** : `claude-sonnet-4-5`
- **Rôle** :
  1. Synthétise tout le déroulé de l'incident
  2. Produit un rapport markdown structuré (cf. table `incident_reports`)
  3. **Calcule le score de confiance** selon une rubrique (cf. section 7)
  4. Met à jour la description de la PR draft avec ce rapport via `gh pr edit <pr_url> --body-file <report.md>`
- **Outils** : `Read`, `Bash`, `Write`

### Choix des modèles — récapitulatif

| Agent | Modèle | Justification |
|---|---|---|
| Orchestrator | Sonnet 4.5 | Pilotage, peu de tokens, raisonnement modéré |
| Collector | Sonnet 4.5 | Compréhension contexte + Q&A |
| Reproducer | Sonnet 4.5 (fallback Opus) | Beaucoup de tool use, raisonnement moyen |
| Fixer | Opus 4.7 | Cœur du raisonnement, complexe |
| Tester | Sonnet 4.5 | Génération de code de test, modéré |
| PR | Haiku 4.5 | Tâche mécanique, économique |
| Reporter | Sonnet 4.5 | Rédaction structurée |

**Prompt caching** activé sur le system prompt + définitions d'outils + contexte projet partagé entre subagents.

## 7. Score de confiance

Rubrique additive, normalisée à 0-1.

| Critère | Pondération | Détail |
|---|---|---|
| Bug reproduit dans l'env de repro | 0.30 | binaire reproduced/partial/not |
| Test ajouté qui échoue sur code pré-fix et passe sur code post-fix | 0.25 | binaire validé/non |
| Suite de tests complète passe post-fix | 0.20 | binaire |
| Linter et formatter passent | 0.10 | binaire |
| Pas plus de 2 itérations fix↔repro nécessaires | 0.10 | bonus si direct |
| Pas de fichiers hors du scope évident touchés (ex: pas de changement de dépendances majeures) | 0.05 | jugement du reporter |

Le reporter justifie chaque points dans `confidence_rationale`. L'orchestrateur peut forcer un plafond (cf. impact reproducer).

## 8. Workflow utilisateur

### Cas nominal
1. User crée un incident via UI (formulaire)
2. Backend persiste l'incident, lance l'orchestrateur dans une asyncio task
3. Collector synthétise → pas de questions → status passe à `reproducing`
4. Reproducer clone, déploie, reproduit → status `fixing`
5. Fixer corrige, valide avec reproducer → status `testing`
6. Tester ajoute/met à jour les tests → status `pushing`
7. PR agent commit, push, ouvre la PR draft → status `reporting`
8. Reporter génère le rapport, met à jour la description de PR → status `done`
9. UI affiche le détail final avec lien PR, rapport, métriques

### Cas Q&A
1. Collector identifie une ambiguïté → status `awaiting_user`
2. Question stockée dans `incident_qa`
3. UI affiche la question dans le détail de l'incident
4. User répond via UI
5. Backend transmet la réponse à la session via `ClaudeSDKClient.query(...)`
6. Collector réévalue → soit autre question, soit avance

### Cas annulation
1. User clique "Annuler" dans l'UI
2. Backend signale la cancellation à la task asyncio (via `asyncio.CancelledError` ou un `CancellationToken` partagé)
3. La `ClaudeSDKClient` est fermée proprement (context manager)
4. Containers Docker créés pour la repro sont stoppés et supprimés
5. Workspace `/tmp/healer/<incident_id>/` est conservé pour inspection (purgé après 7 jours par un job de cleanup au démarrage du backend)
6. Status passe à `cancelled`

### Cas échec
- Toute exception non rattrapée fait passer le status à `failed`
- L'événement d'erreur est loggé dans `agent_events`
- Le workspace est conservé
- L'UI permet de voir la stack trace dans le détail

## 9. UI

Recommandation : **Streamlit** pour le MVP (rapidité de dev, suffisant pour les besoins). Alternative : FastAPI + petit front HTMX/Alpine si on veut plus de contrôle sur le WebSocket et l'ergonomie.

### Pages

**Page "Nouveau traitement"**
- Champ `repo_url` (URL GitHub, validation regex)
- Champ `branch_name` (texte, validation kebab-case)
- Champ `title` (texte court)
- Champ `description` (textarea)
- Champ optionnel `jira_ticket_id` (ex: `PROJ-1234`)
- Upload de fichiers (multi) avec, pour chaque fichier, un champ texte libre pour la description + un select (`log`, `dump`, `screenshot`, `trace`, `other`)
- Bouton "Lancer le traitement"

**Page "Historique"**
- Liste paginée des incidents avec colonnes : titre, status (avec badge couleur), créé le, durée, score confiance, lien PR
- Filtres : status, plage de dates
- Tri par date desc par défaut

**Page "Détail incident"**
- En-tête : titre, status, métadonnées
- Timeline des `agent_events` (groupés par agent, ordre chrono) — vue collapsible
- Métriques : durée totale, durée par agent, tokens input/output, coût estimé USD
- Section Q&A si applicable : questions de l'agent + zone de réponse pour l'user
- Section Rapport (visible si status `done`)
- Bouton "Annuler" si status actif
- Bouton "Ouvrir la PR" si disponible

### Streaming
Les `agent_events` sont émis en temps réel. Si Streamlit : polling toutes les 2s sur l'endpoint events. Si FastAPI custom : WebSocket ou SSE.

## 10. Structure du projet

```
self-healer/
├── pyproject.toml          # uv ou poetry, à toi de voir
├── .env.example            # ANTHROPIC_API_KEY, GH_TOKEN, JIRA_*
├── README.md
├── self_healer/
│   ├── __init__.py
│   ├── main.py             # point d'entrée FastAPI
│   ├── settings.py         # pydantic-settings
│   ├── db.py               # SQLAlchemy ou aiosqlite, schémas
│   ├── models.py           # pydantic models pour l'API
│   ├── api/
│   │   ├── incidents.py    # routes REST
│   │   ├── events.py       # WebSocket/SSE
│   │   └── qa.py           # endpoints Q&A
│   ├── orchestrator/
│   │   ├── runner.py       # boucle principale par incident
│   │   ├── agents.py       # définitions AgentDefinition
│   │   ├── prompts/        # markdown par agent
│   │   │   ├── collector.md
│   │   │   ├── reproducer.md
│   │   │   ├── fixer.md
│   │   │   ├── tester.md
│   │   │   ├── pr.md
│   │   │   └── reporter.md
│   │   ├── tools/          # custom tools
│   │   │   ├── ask_user.py
│   │   │   └── ...
│   │   ├── hooks.py        # PreToolUse, PostToolUse → DB + WS
│   │   └── cost.py         # estimation coût
│   ├── workspace.py        # gestion /tmp/healer
│   ├── confidence.py       # calcul du score
│   └── ui/
│       └── streamlit_app.py
└── tests/
```

## 11. Configuration

Fichier `.env.example` :
```
ANTHROPIC_API_KEY=
GH_TOKEN=                  # ou bien gh CLI déjà loggé
JIRA_BASE_URL=             # optionnel
JIRA_EMAIL=                # optionnel
JIRA_API_TOKEN=            # optionnel
HEALER_WORKSPACE_ROOT=/tmp/healer
HEALER_DB_PATH=./self_healer.db
HEALER_MAX_FIX_REPRO_ITERATIONS=3
HEALER_SESSION_TIMEOUT_MINUTES=30
```

## 12. Hooks et instrumentation

Hooks Agent SDK à brancher dans l'orchestrateur :

- **`SessionStart`** : crée l'event `started` pour l'agent courant
- **`PreToolUse`** : log l'intention (`tool_use`), permet de bloquer des outils dangereux (ex: `rm -rf /`, `git push --force`, opérations sur des chemins hors workspace)
- **`PostToolUse`** : log le résultat (`tool_result`, tronqué à 2000 chars en DB)
- **`UserPromptSubmit`** : utilisé pour les questions de l'agent collecte (custom tool `ask_user`)
- **`Stop`** : finalise l'event `finished`, met à jour les métriques tokens

## 13. Sécurité et garde-fous

- Validation stricte du `repo_url` : doit matcher un GitHub repo, refuser les URLs locales `file://` ou autres protocoles
- Le sandbox runtime Anthropic restreint l'agent au workspace de l'incident
- Hook `PreToolUse` refuse les bash commandes :
  - `rm -rf` avec un chemin hors workspace
  - `git push --force` (force-with-lease toléré)
  - `docker system prune`, `docker volume rm` sur volumes non créés par l'incident
  - `npm publish`, `gh release create`, autres opérations destructives
- Les credentials (`GH_TOKEN`, `JIRA_*`, `ANTHROPIC_API_KEY`) ne sont jamais loggés dans `agent_events`. Les hooks doivent les masquer dans les payloads.
- Timeout global de session configurable (défaut 30 min)

## 14. Critères d'acceptation MVP

Le MVP est considéré comme validé si :

1. Un incident peut être créé via UI avec attachments
2. Le pipeline complet s'exécute sur un repo TS/Next.js de démo (à fournir) avec un bug volontaire de type "null check manquant"
3. L'env Docker du repo démo est déployé sans conflit de port sur la machine
4. Le fix produit passe les tests et le lint
5. Une PR draft est ouverte sur GitHub avec un commit conforme à conventional commits
6. Un rapport est généré et visible dans l'UI + dans la description de la PR
7. L'annulation manuelle d'une session stoppe proprement les containers et la session Claude
8. Le score de confiance est calculé et affiché
9. Q&A fonctionne : l'agent peut poser une question, l'user peut y répondre via l'UI, le pipeline reprend
10. La consommation de tokens et le coût estimé sont visibles par incident

## 15. Points ouverts (à arbitrer pendant l'implémentation)

- **Streamlit vs FastAPI+HTMX** : Streamlit recommandé pour la vitesse de MVP, mais l'expérience streaming est moins fluide. Décision à prendre dès le début.
- **Reproduction browser-based** (Playwright) : reporté en V2 sauf si trivial à brancher
- **Allowlist réseau du sandbox Anthropic** : liste précise à finaliser au premier run, partir d'une base permissive sur dev puis serrer
- **Stratégie de purge** des workspaces : 7 jours par défaut, à ajuster selon usage disque
- **Limite de taille des attachments** : suggéré 50 MB par fichier, 200 MB par incident
- **Gestion des secrets dans les `.env` des repos clients** : pour le MVP, l'user pré-place un `.env.local` dans son workspace ou fournit des fixtures. Pas d'intégration vault.
- **Modèle pour Opus** : valider que la version `claude-opus-4-7` est dispo via API au moment de l'implémentation (sinon fallback `claude-opus-4-6`)

## 16. Roadmap post-MVP (pour mémoire)

- Webhook déclencheur (Sentry, Datadog, Jira)
- Multi-stack (Python, Go, Rust)
- Replay de traces OpenTelemetry pour repro avancée
- Dashboard d'agrégation : MTTR, taux de fix automatique, top causes
- Mode revue humaine obligatoire avant push pour les scores < 0.5
- Déploiement managé (Anthropic Managed Agents ou self-hosted Fly/Modal)