# US-10 — Agent `fixer` + boucle fix↔repro

## Objectif
Produire un correctif minimal, respectant les conventions du projet, validé par re-reproduction.

## Périmètre
**Inclus**
- `prompts/fixer.md` :
  - Reçoit en contexte : `CollectorOutput`, `ReproducerOutput`, chemin du workspace.
  - Étapes : détecter conventions (`eslint`, `prettier`, `biome` via `package.json` scripts), patcher uniquement les fichiers concernés, lancer `lint`/`format`.
  - Si `result == "not_reproduced"` (du reproducer) : produire un **fix défensif** explicitement commenté (`// defensive fix: bug not reliably reproduced — see incident <id>`).
  - **Sortie JSON** : `{"files_changed": [path], "diff_summary": str, "lint_status": "pass|fail", "rationale": str}`.
- `AgentDefinition` :
  - `model`: `claude-opus-4-7` (fallback `claude-opus-4-6`).
  - `tools`: `Read`, `Edit`, `Write`, `Bash`, `Glob`, `Grep`, `Task` (pour invoquer reproducer en validation).
- Boucle fix↔repro orchestrée côté `runner.py` :
  - Iter `i in range(settings.max_fix_repro_iterations)` (défaut 3).
  - Invoke fixer → invoke reproducer `validation_only=True` → si `reproduced` toujours, itérer ; sinon break.
  - À l'épuisement : statut `failed` avec raison "fix loop exhausted", workspace conservé.
  - Compteur d'itérations exposé pour le scoring (bonus si ≤2).
- Garde-fou : le fixer ne doit pas modifier `package.json` (dépendances majeures) sauf si explicitement nécessaire ; sinon il doit le mentionner dans `rationale`. Pénalité de scoring (cf. US-13).

**Out of scope** : tests (US-11), commit (US-12).

## Dépendances
- US-06, US-09.

## Critères d'acceptation
- Sur un bug "null check manquant" du repo de démo : fix appliqué en 1 itération, lint passe, repro post-fix ne reproduit plus le bug.
- Au-delà de `max_fix_repro_iterations`, l'incident est marqué `failed` proprement.
- Si `package.json` est touché, c'est mentionné dans `rationale`.
- Le `diff_summary` est lisible et borné (< 4000 chars).
