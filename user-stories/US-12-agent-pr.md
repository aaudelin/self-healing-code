# US-12 — Agent `pr`

## Objectif
Commit conformément au style projet, push, ouvrir la PR draft GitHub.

## Périmètre
**Inclus**
- `prompts/pr.md` :
  - Étapes :
    1. `git log -n 20 origin/<default_branch> --pretty=format:'%s'` → extraire le pattern (conventional commit ? scopes utilisés ? formulation ?).
    2. Composer un message respectant le pattern détecté.
       - Avec Jira : `<type>(<scope>): <JIRA-ID> <description>` (ex: `fix(api): PROJ-1234 handle null user in profile mapper`).
       - Sans Jira : `<type>(<scope>): <description>`.
    3. `git add -A && git commit -m "<message>"`.
    4. `git push -u origin <branch_name>`.
    5. `gh pr create --draft --title "<title>" --body "<placeholder>"` (le body définitif viendra du reporter US-13).
    6. Récupérer l'URL de la PR (`gh pr view --json url -q .url`).
  - **Sortie JSON** : `{"commit_sha": str, "pr_url": str, "commit_message": str, "title": str}`.
- `AgentDefinition` :
  - `model`: `claude-haiku-4-5`.
  - `tools`: `Bash`, `Read`.
- Côté orchestrateur : persister `pr_url` dans `incidents`.
- Pré-requis runtime : `gh` doit être authentifié sur la machine (vérifié au démarrage avec `gh auth status`, sinon warning au log). Si `GH_TOKEN` est dans `.env`, l'exporter avant la session.

**Out of scope** : description finale (US-13).

## Dépendances
- US-06, US-11.

## Critères d'acceptation
- Sur le repo de démo, un commit unique est créé, pushé, et une PR draft existe sur GitHub.
- Le message respecte le pattern majoritaire des 20 derniers commits.
- `pr_url` est stocké dans `incidents` et un event correspondant émis.
- Pas de `--force` jamais utilisé.
