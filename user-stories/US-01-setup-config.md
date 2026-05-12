# US-01 — Setup & configuration du projet

## Objectif
Poser le squelette du projet Python : packaging, settings, arborescence vide, fichier d'env d'exemple. Aucune logique métier.

## Périmètre
**Inclus**
- `pyproject.toml` (uv recommandé) avec deps : `fastapi`, `uvicorn[standard]`, `pydantic`, `pydantic-settings`, `aiosqlite` (ou `sqlalchemy[asyncio]`), `anthropic`, `claude-agent-sdk`, `python-multipart`, `python-dotenv`, `streamlit`, `httpx`, `aiofiles`, `docker` (SDK python), `gitpython` (optionnel).
- Dev deps : `pytest`, `pytest-asyncio`, `ruff`, `mypy`.
- `.env.example` exact selon section 11 de la spec.
- `self_healer/settings.py` via `pydantic-settings` chargeant le `.env`, exposant : `anthropic_api_key`, `gh_token`, `jira_*`, `workspace_root` (défaut `/tmp/healer`), `db_path`, `max_fix_repro_iterations`, `session_timeout_minutes`.
- Arborescence vide conforme à la section 10 (fichiers `__init__.py`, dossiers `orchestrator/`, `orchestrator/prompts/`, `orchestrator/tools/`, `api/`, `ui/`, `tests/`).
- `README.md` minimal (commandes : install, lancer backend, lancer UI).
- `main.py` : application FastAPI vide avec un seul endpoint `GET /healthz`.

**Out of scope** : tout ce qui touche la DB, les agents, l'UI fonctionnelle.

## Dépendances
Aucune.

## Critères d'acceptation
- `uv sync` (ou `pip install -e .`) passe.
- `uvicorn self_healer.main:app` démarre et `GET /healthz` renvoie `{"status":"ok"}`.
- `from self_healer.settings import settings` charge le `.env` sans erreur.
- `ruff check .` passe.

## Notes
- Pas de Dockerfile pour l'app elle-même (cf. section 2).
- Le `.env.example` doit être commité, le `.env` ignoré.
