# US-03 — Gestion du workspace par incident

## Objectif
Fournir un module qui crée, nettoie et purge les workspaces locaux `/tmp/healer/<incident_id>/`.

## Périmètre
**Inclus**
- `self_healer/workspace.py` exposant :
  - `create_workspace(incident_id: str) -> Path` → crée `<root>/<incident_id>/{repo,attachments,artifacts}` et renvoie le chemin racine.
  - `attachment_path(incident_id, filename) -> Path` → stockage isolé sous `attachments/`.
  - `workspace_path(incident_id) -> Path`.
  - `purge_old_workspaces(max_age_days=7)` appelée au démarrage du backend.
  - `is_path_inside_workspace(path, incident_id) -> bool` (utilitaire utilisé plus tard par les hooks de sécurité, US-14).
- Limites uploads (cf. point ouvert section 15) : helper `validate_attachment_size(size, current_total)` → max 50 MB par fichier, 200 MB cumulés par incident. Lève `ValueError`.
- Helper `cleanup_workspace(incident_id, keep_for_inspection=True)` : par défaut conserve (cas annulation/échec), supprime si `False`.

**Out of scope** : clone Git effectif (fait par l'agent reproducer via Bash), gestion Docker.

## Dépendances
- US-01.

## Critères d'acceptation
- Les workspaces sont créés sous `settings.workspace_root` (configurable).
- `purge_old_workspaces` supprime uniquement les dossiers dont `mtime` > 7j.
- Tests unitaires : création, validation taille, détection in/out workspace.
- Le module ne fait jamais de `shutil.rmtree` sur un chemin hors `workspace_root` (garde-fou).
