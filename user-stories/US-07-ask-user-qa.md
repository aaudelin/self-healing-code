# US-07 — Custom tool `ask_user` + endpoint Q&A

## Objectif
Permettre à l'agent collector de poser une question à l'utilisateur, suspendre la session, recueillir la réponse via UI, et reprendre le pipeline.

## Périmètre
**Inclus**
- `self_healer/orchestrator/tools/ask_user.py` : custom tool Anthropic exposé à l'agent collector.
  - Input schema : `{question: str}`.
  - Comportement :
    1. `db.record_question(incident_id, question)` → insère dans `incident_qa`.
    2. `db.update_status(incident_id, "awaiting_user")` + event `question_asked`.
    3. Attend la réponse : `await registry.wait_for_answer(incident_id, qa_id)` (un dict `{qa_id: asyncio.Future}`).
    4. Retourne au tool result `{"answer": "<texte fourni par user>"}`.
- `self_healer/orchestrator/qa_registry.py` : registre in-memory des futures par `qa_id`. Méthodes `register`, `resolve(qa_id, answer)`, `wait_for_answer`.
- `self_healer/api/qa.py` :
  - `GET /api/incidents/{id}/qa` : liste les questions ouvertes (`answered_at IS NULL`).
  - `POST /api/incidents/{id}/qa/{qa_id}/answer` body `{answer: str}` : valide que la qa appartient à l'incident, persiste la réponse (`db.record_answer`), résout la future via `qa_registry`, repasse le statut à `collecting`.
- Re-transmission à l'agent : la résolution de la future débloque le tool `ask_user`, le collector continue. Si l'utilisateur veut envoyer un message libre (pas en réponse à une question), endpoint `POST /api/incidents/{id}/qa/free` qui fait `ClaudeSDKClient.query(...)` sur la session active (via le registre des tasks de l'orchestrateur, US-06).
- Timeout de patience configurable (réutilise `session_timeout_minutes`) : si pas de réponse, statut `failed` avec raison "timeout user input".

**Out of scope** : UI Streamlit (US-15), affichage de la question (US-15).

## Dépendances
- US-06 (registre de sessions, machine à états).

## Critères d'acceptation
- Un collector stub qui appelle `ask_user("Quel env ?")` met l'incident en `awaiting_user`, persiste la question.
- `POST /api/incidents/{id}/qa/{qa_id}/answer` débloque le pipeline, statut repasse à `collecting`.
- La réponse user est bien remontée comme `tool_result` à la session Claude (vérifiable via `agent_events`).
- Une 2e question consécutive est gérée (le collector peut boucler).
