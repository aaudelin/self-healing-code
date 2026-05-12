# US-14 — Garde-fous sécurité & suivi coût/tokens

## Objectif
Bloquer les opérations dangereuses via `PreToolUse`, masquer les secrets, calculer et stocker le coût par incident.

## Périmètre
**Inclus**
- `self_healer/orchestrator/security.py` : règles de blocage appelées par `PreToolUse` (US-05).
  - Refuser `Bash` si la commande :
    - matche `rm\s+-rf?\s+` avec un chemin **hors workspace** (utiliser `workspace.is_path_inside_workspace`).
    - contient `git push --force` (toléré : `--force-with-lease`).
    - matche `docker (system|volume) (prune|rm)` sur ressources non taggées avec le `incident_id`.
    - matche `npm publish`, `pnpm publish`, `yarn publish`, `gh release create`.
    - matche `curl|wget` vers hôtes hors allowlist (allowlist dans settings, défaut : `api.anthropic.com`, `github.com`, `registry.npmjs.org`, `registry.yarnpkg.com`, `hub.docker.com`, `pypi.org`).
  - Refuser `Write`/`Edit` sur des chemins hors workspace.
  - Toute violation : event `tool_use` flaggé `blocked=true`, raison loggée, le SDK reçoit un `deny` avec le message à transmettre à l'agent.
- Masquage des secrets (étendre US-05) : régex sur valeurs connues + patterns `Bearer\s+[A-Za-z0-9_-]{20,}`, `ghp_[A-Za-z0-9]{30,}`, `sk-ant-[A-Za-z0-9_-]+`.
- `self_healer/orchestrator/cost.py` :
  - Table de prix par modèle (entrée/sortie par M tokens), à coder explicitement et marquée "vérifier au moment de l'implémentation" :
    ```python
    # Tarifs à confirmer au moment de l'implémentation
    PRICING = {
      "claude-sonnet-4-5": {"input": 3.00, "output": 15.00},
      "claude-opus-4-7":   {"input": 15.00, "output": 75.00},
      "claude-haiku-4-5":  {"input": 0.80, "output": 4.00},
    }
    ```
  - Fonction `estimate(model, tokens_in, tokens_out) -> float`.
  - Hook `Stop` (US-05) : récupère les usages tokens du dernier turn, appelle `bump_metrics(incident_id, tokens_in, tokens_out, cost)`.
  - Prompt caching : décompter les `cache_read_input_tokens` à un tarif réduit (10% du prix input) si exposés par l'API.
- Timeout global : déjà géré US-06, ici on documente.

**Out of scope** : sandbox runtime config détaillée (à finaliser au 1er run, cf. spec section 15).

## Dépendances
- US-05, US-06.

## Critères d'acceptation
- Tentative `Bash` avec `rm -rf /tmp/other` est bloquée et loggée.
- `git push --force-with-lease` est autorisé, `git push --force` non.
- Un `ANTHROPIC_API_KEY` apparaissant dans une sortie de tool est masqué en DB et WS.
- Après un run complet de démo, `incidents.total_cost_usd > 0` et reflète bien la somme des sous-agents.
- Tests unitaires couvrant les règles regex de blocage.
