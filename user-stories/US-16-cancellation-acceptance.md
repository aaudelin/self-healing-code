# US-16 — Annulation propre, cleanup, recette d'acceptation

## Objectif
Finaliser les chemins d'annulation/échec, mettre en place la purge périodique, et fournir un scénario de recette reproductible sur un repo de démo.

## Périmètre
**Inclus**
- Annulation (complète l'amorce de US-04/US-06) :
  - L'endpoint `POST /api/incidents/{id}/cancel` :
    1. Vérifie le statut (terminal → 409).
    2. Set le `CancellationToken` de la task associée.
    3. La task `run_incident` rattrape, ferme `ClaudeSDKClient` (context manager), appelle `docker_cleanup(incident_id)` qui :
       - liste les containers labellisés `healer.incident_id=<id>` (label à poser systématiquement par le reproducer).
       - `docker stop && docker rm` chacun.
       - `docker network rm` les networks créés pour cet incident.
       - n'efface PAS les volumes (sauf si labellisés `healer.ephemeral=true`).
    4. Conserve le workspace (`cleanup_workspace(keep_for_inspection=True)`).
    5. Statut → `cancelled` + event final.
- Échec :
  - Toute exception non rattrapée dans `run_incident` est convertie en statut `failed` avec event `failed` payload `{stack: str}`.
  - Le workspace est conservé.
- Purge périodique :
  - Au démarrage : `workspace.purge_old_workspaces()` (US-03).
  - Job léger : asyncio task qui re-tourne toutes les 24h.
- **Repo démo** :
  - Créer ou pointer un petit repo `examples/demo-bug-nextjs/` (peut être en sous-dossier non commité, juste référencé dans le README) reproduisant un bug "null check manquant" dans une route API Next.js + un test unitaire absent.
  - Documenter dans `README.md` : étapes pour lancer le scénario complet (créer l'incident via UI avec repo URL et branch `fix/demo-null-check`).
- Script de recette `scripts/acceptance.py` :
  - Crée l'incident via l'API.
  - Stream les events.
  - Vérifie un par un les 10 critères de la section 14 de la spec.
  - Sort un rapport pass/fail.

**Out of scope** : webhook, multi-stack, repli intelligent (V2).

## Dépendances
- Toutes les stories précédentes.

## Critères d'acceptation
- `python scripts/acceptance.py` lance un run de bout en bout sur le repo démo et coche les 10 critères MVP (section 14).
- Annulation au milieu d'une repro : containers stoppés en <5s, statut `cancelled`, workspace toujours présent.
- Un workspace de 8 jours est purgé au démarrage suivant ; un de 6 jours est conservé.
- En cas d'échec d'un agent (exception levée), statut `failed`, stack visible dans l'UI, workspace présent pour inspection.
