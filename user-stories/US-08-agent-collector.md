# US-08 — Agent `collector`

## Objectif
Implémenter le premier subagent : lit description + attachments, produit la synthèse structurée, pose des questions tant qu'il y a des ambiguïtés.

## Périmètre
**Inclus**
- `self_healer/orchestrator/prompts/collector.md` : prompt système. Doit :
  - Définir la mission (synthèse, hypothèses, repro hints).
  - Imposer la sortie **strictement JSON** : `{"summary": str, "hypothesized_area": str, "repro_hints": [str], "open_questions": [str]}`.
  - Indiquer la stratégie : lire chaque attachment via `Read`, grep le repo (déjà cloné par US-09 ? non — à ce stade pas encore cloné, le collector travaille uniquement sur description + attachments locaux dans `attachments/`).
  - Règle clé : si `open_questions` non vide, **appeler le tool `ask_user` une question à la fois** plutôt que de retourner la liste.
- `AgentDefinition` enregistrée dans `agents.py` (US-06) :
  - `model`: `claude-sonnet-4-5`.
  - `tools`: `["Read", "Grep", "ask_user"]`.
  - `cwd`: workspace de l'incident (les attachments y sont).
- Côté orchestrateur (`runner.py`) : après invocation du collector, parser le JSON final. Si erreur de parsing, redemander une fois ; sinon `failed`. Stocker la synthèse en mémoire pour la passer aux subagents suivants.

**Out of scope** : clone Git (US-09), Q&A backend (déjà US-07).

## Dépendances
- US-06 (orchestrator), US-07 (ask_user).

## Critères d'acceptation
- Sur un incident avec description ambiguë, le collector pose au moins une question via `ask_user` avant de finir.
- Sur un incident clair, sort directement un JSON valide avec `open_questions: []`.
- Le JSON est validé par un modèle Pydantic `CollectorOutput` côté orchestrateur.
- Pas d'écriture dans le repo (lecture seule sur attachments).
