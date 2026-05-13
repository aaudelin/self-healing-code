# Self-Healer

MVP local d'un agent Claude qui prend en entrée un incident logiciel et automatise le cycle complet : compréhension, reproduction, correctif, tests, PR draft, rapport.

Stack cible des projets traités : TypeScript / Next.js / Nest.js dans un monorepo turborepo.

## Prérequis

- Python 3.11+
- [uv](https://github.com/astral-sh/uv) (recommandé) ou pip
- Docker engine local
- CLI `gh` installée et authentifiée

## Installation

```bash
uv sync
# ou : pip install -e ".[dev]"
```

Copier `.env.example` vers `.env` et renseigner au minimum `ANTHROPIC_API_KEY`.

```bash
cp .env.example .env
```

## Lancer le backend

```bash
uvicorn self_healer.main:app --reload
```

Vérification : `curl http://localhost:8000/healthz` → `{"status":"ok"}`.

## Lancer l'UI

```bash
streamlit run self_healer/ui/streamlit_app.py
```

## Développement

```bash
ruff check .
mypy self_healer
pytest
```
