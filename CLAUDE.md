# CLAUDE.md

## Projet

On construit **le même agent self-healing deux fois**, à specs strictement identiques, pour comparer honnêtement Python et Rust sur une implémentation pilotée par IA :

- **Implémentation A** : Python + Claude Agent SDK officiel (`claude-agent-sdk`) → `backend-python/`
- **Implémentation B** : Rust + wrapper HTTP custom (types + agent loop écrits à la main) → `backend-rust/`

Specs de référence : `user-stories/draft/ITERATION-01-*.md`. Les deux backends doivent exposer le **même contrat d'API** et le **même comportement**. Toute divergence fonctionnelle est un bug, pas une variation.

## Protocole de suivi de la comparaison (IMPORTANT)

Le livrable de comparaison est `comparison/TRACKING.md`. Le tenir à jour fait partie de chaque tâche. Règle d'or : **chiffre approximatif honnête > chiffre absent** ; si une mesure n'a pas de sens pour une stack, mettre `n/a` + une note. Ne **jamais** inventer les chiffres `[auto-*]` : ils ne viennent que des scripts.

1. **Bornage des phases** — au début d'un bloc de travail focalisé sur une implémentation :
   `comparison/scripts/phase.sh <python|rust> <setup|agent-loop|review|bench> start`
   et à la fin : `comparison/scripts/phase.sh <python|rust> <phase> end`.
   Ne pas laisser une phase ouverte pendant du travail sans rapport.

2. **Commandes de feedback** — lancer les builds/tests/run via le wrapper, pour capter code retour + durée :
   `comparison/scripts/run.sh cargo build` · `comparison/scripts/run.sh pytest` · etc.

3. **Observations qualitatives** — consigner **au fil de l'eau** dans `comparison/TRACKING.md` (journal + cellule `[manuel]` concernée) : galères, surprises, bugs trouvés *après* que « ça compile et tourne », code « correct en surface mais douteux sur le fond », zones opaques, et les fois où il a fallu expliquer au modèle un truc spécifique au langage.

4. **Agrégation** — à chaque fin de phase : `python3 comparison/scripts/aggregate.py` (régénère `comparison/metrics/SUMMARY.md`).

5. **Persistance** — le conteneur est éphémère : **committer `comparison/metrics/events.jsonl`** (et `TRACKING.md`) sinon les mesures sont perdues entre sessions.

### Ce qui est automatique vs manuel
- **Hooks** (`.claude/settings.json`) : comptent les prompts (UserPromptSubmit) et les éditions de fichiers (PostToolUse). Zéro effort.
- **Wrapper `run.sh`** : code retour + durée des commandes (échecs de build, latence modif→feedback).
- **`bench.sh`** : mesures runtime (taille, cold start, mémoire, débit), à lancer quand les backends tournent.
- **Tout le reste** (review %, confiance 1-10, surprises, verdict) est un **jugement humain** : à saisir dans `TRACKING.md`.

> Note : l'exécution automatique des hooks de projet en environnement Claude Code web n'est pas garantie (modèle de confiance non documenté). `phase.sh`, `run.sh` et `aggregate.py` fonctionnent indépendamment des hooks — en cas de doute, je les appelle explicitement.
