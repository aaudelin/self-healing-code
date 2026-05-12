# Index des User Stories — Self-Healing Software Agent

Décomposition de [MVP-01.md](draft/MVP-01.md) en lots d'implémentation Claude Code, ordonnés par dépendances.

## Ordre d'exécution recommandé

| # | Story | Dépend de | Sujet |
|---|---|---|---|
| 01 | [Setup & configuration](./US-01-setup-config.md) | — | `pyproject.toml`, `.env`, settings, structure |
| 02 | [Couche base de données](./US-02-database.md) | 01 | SQLite, schémas, modèles Pydantic |
| 03 | [Gestion du workspace](./US-03-workspace.md) | 01 | `/tmp/healer/<id>/`, clone, cleanup |
| 04 | [API REST incidents](./US-04-rest-api.md) | 02, 03 | Routes FastAPI CRUD incidents, attachments |
| 05 | [Streaming events & hooks](./US-05-events-hooks.md) | 02, 04 | Hooks SDK, WebSocket/SSE, persistance events |
| 06 | [Orchestrateur cœur](./US-06-orchestrator-core.md) | 02, 03, 05 | `ClaudeSDKClient` session, machine à états |
| 07 | [Custom tool ask_user & Q&A](./US-07-ask-user-qa.md) | 06 | Tool `ask_user`, endpoint réponse, reprise session |
| 08 | [Agent collector](./US-08-agent-collector.md) | 06, 07 | Synthèse incident, hypothèses, questions |
| 09 | [Agent reproducer](./US-09-agent-reproducer.md) | 06 | Clone, Docker compose, ports dynamiques |
| 10 | [Agent fixer + boucle fix↔repro](./US-10-agent-fixer.md) | 06, 09 | Correctif minimal, lint, itérations |
| 11 | [Agent tester](./US-11-agent-tester.md) | 06 | Test rouge→vert, suite complète |
| 12 | [Agent PR](./US-12-agent-pr.md) | 06 | Commit conventional, `gh pr create --draft` |
| 13 | [Agent reporter & score confiance](./US-13-agent-reporter.md) | 02, 06 | Rapport markdown, rubrique 0-1 |
| 14 | [Garde-fous & suivi coût](./US-14-security-cost.md) | 05, 06 | Blocage commandes, masquage secrets, tokens/$ |
| 15 | [UI Streamlit](./US-15-ui-streamlit.md) | 04, 05 | Pages création / historique / détail |
| 16 | [Annulation, cleanup, recette](./US-16-cancellation-acceptance.md) | toutes | Cancel propre, purge 7j, repo démo |

## Conventions

- Toute story produit du code dans `self_healer/` selon l'arborescence de la section 10 de la spec.
- Les critères d'acceptation de chaque story sont un sous-ensemble de la section 14 de la spec.
- Les modèles Claude utilisés sont ceux de la section 6 (Sonnet 4.5 par défaut, Opus 4.7 pour fixer, Haiku 4.5 pour pr).
- Les noms de modèles à utiliser via le SDK : `claude-sonnet-4-5`, `claude-opus-4-7` (fallback `claude-opus-4-6`), `claude-haiku-4-5`.
