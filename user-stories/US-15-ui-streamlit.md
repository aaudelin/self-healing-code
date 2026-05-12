# US-15 — UI Streamlit

## Objectif
Frontend Streamlit avec 3 pages : nouveau traitement, historique, détail incident (timeline, Q&A, rapport).

## Périmètre
**Inclus**
- `self_healer/ui/streamlit_app.py` : entrée Streamlit, navigation via `st.sidebar` ou `st.tabs`.
- Page **Nouveau traitement** :
  - Form : `repo_url`, `branch_name`, `title`, `description`, `jira_ticket_id?`.
  - File uploader multiple ; pour chaque fichier uploadé, ligne avec champ `description` + `selectbox(kind=[log, dump, screenshot, trace, other])`.
  - Bouton "Lancer le traitement" → POST `/api/incidents` (multipart) puis redirige sur le détail.
- Page **Historique** :
  - Tableau (`st.dataframe`) : titre, status (badge couleur via styling conditionnel), créé le, durée, score, lien PR (cliquable).
  - Filtres en haut : multiselect status, plage de dates.
  - Pagination simple (`page_number` query param).
- Page **Détail incident** :
  - Header : titre, status badge, metadata (repo, branch, jira).
  - Métriques : durée totale, durée par agent (calcul depuis `agent_events`), tokens in/out, coût USD (`st.metric`).
  - Timeline : events groupés par agent dans des `st.expander` collapsibles, dans l'ordre chrono. Rendu compact : icône par `event_type`, timestamp relatif.
  - Streaming : polling `GET /api/incidents/{id}/events?since=<ts>` toutes les 2s via `st.autorefresh` ou rerun manuel ; mettre à jour le `since` à chaque tick.
  - Section Q&A : si une question est ouverte (`GET /api/incidents/{id}/qa`), afficher la question + textarea + bouton "Répondre" qui POST sur l'endpoint Q&A.
  - Section Rapport : si `status==done`, rendu markdown via `st.markdown(report.markdown_full)`.
  - Bouton "Annuler" si statut actif → POST cancel.
  - Bouton "Ouvrir la PR" si `pr_url` présent.
- Client API : `self_healer/ui/api_client.py` (httpx) avec base URL configurable (`HEALER_API_URL`, défaut `http://localhost:8000`).

**Out of scope** : auth, multi-user.

## Dépendances
- US-04, US-05 (endpoints prêts).

## Critères d'acceptation
- `streamlit run self_healer/ui/streamlit_app.py` démarre l'UI.
- Création complète d'un incident avec attachments depuis l'UI.
- Le détail se met à jour ~temps réel (delta ≤ 2s) pendant un pipeline.
- Q&A : poser une question depuis un agent stub → la question apparaît dans l'UI → réponse user → pipeline reprend.
- Annulation depuis l'UI → statut `cancelled` visible en <5s.
