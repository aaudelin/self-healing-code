# US-13 — Agent `reporter` & score de confiance

## Objectif
Synthétiser le déroulé, calculer le score de confiance selon la rubrique, mettre à jour la PR draft.

## Périmètre
**Inclus**
- `self_healer/confidence.py` : calcul pur (testable unitairement) à partir des inputs des agents amont.
  - Entrée : `ReproducerOutput`, `FixerLoopMetrics`, `TesterOutput`, info "package.json modifié".
  - Sortie : `(score: float, rationale: dict[criterion -> {weight, awarded, comment}])`.
  - Rubrique exacte (section 7) :
    | Critère | Poids | Calcul |
    |---|---|---|
    | Bug reproduit | 0.30 | reproduced=1.0, partial=0.5, not=0.0 |
    | Test rouge→vert validé | 0.25 | validated=1.0, sinon 0.0 |
    | Suite tests post-fix passe | 0.20 | passed>0 et failed==0 |
    | Lint+format passent | 0.10 | depuis `FixerOutput.lint_status` |
    | ≤2 itérations fix↔repro | 0.10 | bonus si direct |
    | Pas de hors-scope | 0.05 | jugement reporter |
  - Plafonds : si `reproducer.result == "partially"` → cap 0.6 ; `"not"` → cap 0.3.
- `prompts/reporter.md` :
  - Inputs : tous les outputs intermédiaires + `agent_events` (résumé).
  - Produit un markdown structuré couvrant : `summary`, `root_cause`, `fix_description`, `reproduction_steps`, `validation_steps`, `confidence_score`, `confidence_rationale`.
  - Le reporter appelle `confidence.compute(...)` via un custom tool `compute_confidence` (Python) plutôt que de calculer lui-même → garantit la déterminisme.
  - **Sortie JSON** : `{"markdown_full": str, "fields": IncidentReportFields}`.
- `self_healer/orchestrator/tools/compute_confidence.py` : custom tool exposant `confidence.compute`.
- `AgentDefinition` :
  - `model`: `claude-sonnet-4-5`.
  - `tools`: `Read`, `Bash`, `Write`, `compute_confidence`.
- Côté orchestrateur :
  - Persister dans `incident_reports` via `db.upsert_report`.
  - `gh pr edit <pr_url> --body-file <report.md>` pour mettre à jour la PR.
  - Statut final → `done`.

**Out of scope** : UI rendu (US-15).

## Dépendances
- US-02, US-06, US-09, US-10, US-11, US-12.

## Critères d'acceptation
- `confidence.compute` couvert par tests unitaires (plafonds, bonus itérations, lint, etc.).
- Sur le scénario nominal de démo : score ≥ 0.85.
- Sur un scénario `not_reproduced` : score ≤ 0.30 quel que soit le reste.
- PR GitHub a un body markdown identique à `incident_reports.markdown_full`.
