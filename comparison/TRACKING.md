# Comparaison Python vs Rust — agent self-healing

Même agent, **deux implémentations à specs strictement identiques** (cf. `user-stories/draft/ITERATION-01-*.md`) :

- **Implémentation A** : Python + Claude Agent SDK officiel (`claude-agent-sdk`)
- **Implémentation B** : Rust + wrapper HTTP custom (pas de SDK : types + agent loop écrits à la main)

> **Règle d'or** : chiffre approximatif honnête > chiffre absent. Si une mesure n'a pas de sens pour une stack, mettre `n/a` + une note.

**Légende source** : `[auto-hook]` capté par les hooks Claude Code · `[auto-bench]` capté par `scripts/bench.sh` · `[auto-git]` calculé sur le dépôt · `[manuel]` jugement humain à saisir.

Les valeurs `[auto-*]` sont régénérées dans `comparison/metrics/SUMMARY.md` (ne pas les recopier à la main ici tant que ce n'est pas figé).

---

## Les 5 questions (engagement public — à trancher à la fin)

1. **La mise en place est-elle encore 2× plus longue en Rust ? 3× ? Marginale ?** → _réponse :_
2. **Sur quel type de tâche l'agent galère vraiment en Rust ?** → _réponse :_
3. **Le code qui sort, je le relis combien de fois moins qu'un Python « qui marche en surface » ?** → _réponse :_
4. **Quel est le niveau de qualité finale des deux approches ?** → _réponse :_
5. **La performance finale pèse-t-elle plus que la simplicité initiale ?** → _réponse :_

---

## 1. Setup initial (de zéro à « ça compile et appelle l'API Claude »)

| Critère | A — Python | B — Rust | Source |
|---|---|---|---|
| Temps total setup | | | [auto-hook] (phase `setup`) |
| Étapes (liste) | | | [manuel] |
| Galères / blocages | | | [manuel] |
| Aide IA utilisée (nb de prompts) | | | [auto-hook] |
| Ce qui a surpris | | | [manuel] |

## 2. Construction de l'agent loop (de « API call simple » à « lit logs + Jira → patch »)

| Critère | A — Python | B — Rust | Source |
|---|---|---|---|
| Temps total de construction | | | [auto-hook] (phase `agent-loop`) |
| Lignes écrites à la main | | | [manuel] (estimé) |
| Lignes générées par l'IA (estimées) | | | [auto-git] / [manuel] |
| Lignes de code finales (total) | | | [auto-git] |
| Nb d'itérations / cycles agent implémentés | | | [manuel] |
| Galères / classes de bugs | | | [manuel] |

## 3. Qualité du code produit (review humaine honnête)

| Critère | A — Python | B — Rust | Source |
|---|---|---|---|
| % de code réécrit / corrigé en review | | | [manuel] |
| Bugs trouvés après « ça compile et tourne » | | | [manuel] |
| Code « correct en surface mais douteux sur le fond » | | | [manuel] |
| Zones de complexité opaque (peur de relire) | | | [manuel] |
| Confiance subjective (1-10) | | | [manuel] |

## 4. Deploy & runtime

| Critère | A — Python | B — Rust | Source |
|---|---|---|---|
| Taille binaire / image Docker | | | [auto-bench] |
| Temps de démarrage (cold start) | | | [auto-bench] |
| Mémoire à idle | | | [auto-bench] |
| Mémoire en pleine charge (1 ticket) | | | [auto-bench] |
| Temps moyen de traitement d'un ticket | | | [auto-bench] |

## 5. Itération / debug pendant la construction

| Critère | A — Python | B — Rust | Source |
|---|---|---|---|
| Temps moyen modif → feedback (compile/run) | | | [auto-hook] |
| Erreurs compilateur « pédago » (qualitatif) | | | [manuel] |
| Fois où l'IA s'est auto-corrigée sur une erreur compilo | | | [auto-hook] (heuristique) + [manuel] |
| Fois où j'ai dû expliquer un truc spécifique au langage | | | [manuel] |

## 6. Verdict subjectif (à remplir à la fin)

- **Si je redémarrais demain un nouvel agent IA, je partirais sur…** : _…_
- **Le critère qui a le plus pesé** : _…_
- **Ce que j'aurais aimé savoir avant de commencer** : _…_

---

## Journal chronologique (notes datées au fil de l'eau)

> Une ligne par observation notable, format `AAAA-MM-JJ — [A/B] — note`. C'est la matière première des sections [manuel] ci-dessus.

- 
