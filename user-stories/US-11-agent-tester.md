# US-11 — Agent `tester`

## Objectif
Mettre à jour ou créer des tests autour de la zone modifiée, ajouter un test qui aurait dû détecter le bug, lancer la suite complète.

## Périmètre
**Inclus**
- `prompts/tester.md` :
  - Inputs : `FixerOutput.files_changed`, synthèse incident, repro evidence.
  - Étapes :
    1. Détecter le framework de test (jest, vitest, playwright pour e2e, etc.) via `package.json`.
    2. Identifier les tests existants couvrant les fichiers modifiés (`Grep`, conventions `__tests__/`, `*.spec.ts`).
    3. Mettre à jour les tests existants si la sémantique a changé.
    4. **Ajouter un test qui aurait dû détecter le bug initial**.
       - Validation idéale : checkout temporaire du commit pré-fix → run le nouveau test (doit échouer) → revert → run (doit passer). Pour le MVP, faire au mieux et logger.
    5. Lancer la suite de tests complète. Capturer `passed/failed/skipped` et la sortie.
  - **Sortie JSON** : `{"new_test_files": [path], "updated_test_files": [path], "red_then_green_validated": bool, "suite_result": {"passed": int, "failed": int, "skipped": int}, "suite_command": str}`.
- `AgentDefinition` :
  - `model`: `claude-sonnet-4-5`.
  - `tools`: `Read`, `Edit`, `Write`, `Bash`, `Glob`, `Grep`.
- Côté orchestrateur : si `suite_result.failed > 0`, statut `failed` (un test cassé bloque le push). Si `red_then_green_validated == false`, on continue mais la pénalité de score s'applique (US-13).

**Out of scope** : push (US-12), rapport (US-13).

## Dépendances
- US-06, US-10.

## Critères d'acceptation
- Sur le repo de démo, le tester ajoute un test pertinent et la suite globale passe.
- `red_then_green_validated` est `true` si la validation rouge→vert a pu être effectuée.
- La commande de suite (`pnpm test`, `turbo test`, …) est détectée et exécutée depuis le workspace.
