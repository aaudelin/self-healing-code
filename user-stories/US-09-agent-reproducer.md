# US-09 — Agent `reproducer`

## Objectif
Cloner le repo, déployer l'env applicatif via Docker (ports dynamiques), tenter de reproduire le bug, classer le résultat.

## Périmètre
**Inclus**
- `prompts/reproducer.md` :
  - Étapes : clone HTTPS du `repo_url` dans `workspace/repo`, checkout/création de `branch_name`.
  - Inspection : `package.json`, `turbo.json`, `docker-compose*.yml`, `Dockerfile*`, `.env.example`, `README.md`.
  - Construction d'un `docker-compose` ou réutilisation existant. **Règle dure** : tous les ports exposés doivent être dynamiques (utiliser `0:<port>` dans compose, ou découvrir un port libre via Python et l'injecter en variable d'env). Stocker le mapping dans `workspace/artifacts/ports.json`.
  - Tentative de repro suivant `repro_hints` du collector.
  - **Sortie JSON stricte** : `{"result": "reproduced|partially_reproduced|not_reproduced", "evidence": str, "ports": {service: host_port}, "compose_path": str, "logs_excerpt": str}`.
- `AgentDefinition` :
  - `model`: `claude-sonnet-4-5` ; fallback `claude-opus-4-7` si 2 tentatives échouent (l'orchestrateur ré-instancie avec `model=opus`).
  - `tools`: `Bash`, `Read`, `Write`, `Edit`, `Glob`, `Grep`, `WebFetch`.
- Helper Python `self_healer/orchestrator/ports.py` : `pick_free_port() -> int` via `socket.bind(('', 0))`. Exposé éventuellement en custom tool si besoin (sinon le prompt explique l'usage en Bash).
- Impact sur le score (cf. section 7) : l'orchestrateur capte `result` et plafonne le `confidence_score` ultérieur (`partially=0.6`, `not=0.3`).
- Mode "validation post-fix" : le reproducer peut être ré-invoqué par le fixer (US-10) sans recloner — l'orchestrateur passe un flag `validation_only=True` qui zappe les étapes clone/build et relance juste la séquence de repro.

**Out of scope** : repro browser-based (Playwright) → V2 (cf. point ouvert).

## Dépendances
- US-06.

## Critères d'acceptation
- Sur un repo TS/Next/turborepo de démo, le reproducer clone, démarre `docker compose up -d` avec ports dynamiques, et écrit `ports.json`.
- Aucun conflit de port même si un autre service tourne sur 3000 / 5432 sur la machine hôte.
- Le résultat JSON est validé par un modèle Pydantic `ReproducerOutput`.
- En mode `validation_only`, le reproducer relance la repro en <2 min sans recloner.
