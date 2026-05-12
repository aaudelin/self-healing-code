# US-02 — Couche base de données SQLite

## Objectif
Implémenter le schéma SQLite, l'init automatique au démarrage, et les modèles Pydantic associés.

## Périmètre
**Inclus**
- `self_healer/db.py` : connexion `aiosqlite` (ou SQLAlchemy async), création des tables au démarrage si absentes, migration triviale (`CREATE TABLE IF NOT EXISTS`).
- Tables exactes selon section 5 de la spec :
  - `incidents` (PK UUID texte, tous les champs listés y compris `workspace_path`, métriques tokens/coût, timestamps).
  - `incident_attachments`.
  - `agent_events` (champ `payload` JSON texte, `tokens_input/output` nullable).
  - `incident_qa`.
  - `incident_reports` (PK = `incident_id`).
- Index sur `agent_events.incident_id`, `incidents.status`, `incidents.created_at`.
- `self_healer/models.py` : modèles Pydantic correspondants (`Incident`, `IncidentCreate`, `IncidentAttachment`, `AgentEvent`, `IncidentQA`, `IncidentReport`). Enum `IncidentStatus` couvrant les 11 valeurs de la spec.
- Repository functions async : `create_incident`, `get_incident`, `list_incidents(filters)`, `update_status`, `append_event`, `add_attachment`, `record_question`, `record_answer`, `upsert_report`, `bump_metrics(tokens_in, tokens_out, cost)`.
- Tests unitaires CRUD basiques.

**Out of scope** : routes HTTP, hooks SDK, logique business.

## Dépendances
- US-01 (settings, structure).

## Critères d'acceptation
- Au lancement de l'app, le fichier `HEALER_DB_PATH` est créé avec toutes les tables.
- Les fonctions du repository sont 100% async et utilisent des paramètres bindés (pas de string concat SQL).
- `pytest tests/test_db.py` passe.
- Insertion d'un event avec payload >2000 chars : pas de troncature côté repo (la troncature est responsabilité des hooks, cf. US-05).
