# US-04 — API REST incidents

## Objectif
Exposer les endpoints HTTP pour créer, lister, consulter, annuler un incident, et uploader des attachments.

## Périmètre
**Inclus**
- `self_healer/api/incidents.py` :
  - `POST /api/incidents` : multipart form acceptant `repo_url`, `branch_name`, `title`, `description`, `jira_ticket_id?`, et `files[]` avec pour chaque fichier `description` et `kind`. Validation :
    - `repo_url` : doit matcher `^https://github\.com/[^/]+/[^/]+(\.git)?$` (refuser `file://`, autres protocoles).
    - `branch_name` : kebab-case `^[a-z0-9]+(-[a-z0-9]+)*(/[a-z0-9-]+)*$` (autoriser `feature/xxx`).
    - `jira_ticket_id` optionnel : `^[A-Z][A-Z0-9]+-\d+$`.
  - Persiste l'incident (`status=pending`), copie les fichiers via `workspace.attachment_path`, enregistre les `incident_attachments`.
  - Renvoie `201 {id, status, ...}`.
  - Ne lance PAS encore l'orchestrateur ici → stub `kick_off_pipeline(incident_id)` à brancher en US-06.
  - `GET /api/incidents` : pagination (`?page=&size=`), filtres `status`, `created_after`, `created_before`. Tri par `created_at desc`.
  - `GET /api/incidents/{id}` : détail complet (incident + attachments + dernier rapport si dispo).
  - `GET /api/incidents/{id}/events?since=<ts>` : retourne les events depuis un timestamp (polling fallback si pas de WebSocket).
  - `POST /api/incidents/{id}/cancel` : marque l'incident `cancelled`, déclenche le hook de cancellation (stub appelé par US-16).
- `self_healer/main.py` : enregistrement du router, gestion CORS dev (`http://localhost:8501` pour Streamlit), startup event qui appelle `db.init()` et `workspace.purge_old_workspaces()`.
- Tests d'intégration HTTP (TestClient) couvrant : création OK, validation regex, 404, listing paginé.

**Out of scope** : Q&A (US-07), WebSocket streaming (US-05), lancement réel de l'orchestrateur.

## Dépendances
- US-02 (modèles + repo), US-03 (workspace).

## Critères d'acceptation
- `POST /api/incidents` avec un payload valide retourne 201 et crée bien le dossier workspace + attachments.
- Refus 422 sur `repo_url=file:///tmp/x` ou `branch_name=Feature/X`.
- Upload >50 MB par fichier → 413.
- `GET /api/incidents?status=done&size=10` retourne max 10 items triés desc.
- `POST /api/incidents/{id}/cancel` retourne 409 si l'incident est déjà terminal (`done`, `failed`, `cancelled`).
