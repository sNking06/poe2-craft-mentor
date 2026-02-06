# POE2 Craft Mentor

Site de conseil craft POE2 axe sur une question simple:
- "Je veux cette ligne de craft" -> l'app recommande la meilleure methode et les currencies a utiliser.

## Objectif produit
L'utilisateur ne doit pas choisir lui-meme la methode.
Il decrit le resultat voulu, le site decide:
- quelle methode utiliser (`essence`, `annul/exalt`, `chaos spam`, `vaal finish`, `fracture`, `budget progressif`)
- quelles currencies acheter/utiliser en priorite
- le cout estime et la compatibilite budget

## Fonctionnement utilisateur
1. Saisir la/les lignes souhaitees (ex: `+life, +all resist`).
2. Choisir le type d'item et le budget.
3. Recevoir automatiquement:
   - la methode recommandee
   - la liste ordonnee des currencies
   - les quantites estimees
   - un plan d'action simple

## Data economie (PoE2DB)
Source:
- `https://poe2db.tw/Economy`
- tous les segments (`Currency`, `Fragments`, `Ritual`, `Essences`, `Breach`, `Delirium`, `Expedition`, `Runes`, `Soul Cores`, `Idols`, `Uncut Gems`, `Abyss`, `Gems`, `Incursion`)

Pipeline:
- Script de collecte: `ops/fetch-poe2db-economy.js`
- Fichier genere: `frontend/data/economy.json`
- Le frontend lit ce JSON au chargement.

## Deployment GitHub Pages
Workflow:
- `.github/workflows/pages.yml`

A chaque push sur `main`:
1. le workflow regenere `frontend/data/economy.json` depuis PoE2DB
2. deploye `frontend/` sur GitHub Pages

## Lancer en local
- Ouvrir `frontend/index.html` dans le navigateur.

## Regenerer les donnees economie manuellement
```bash
node ops/fetch-poe2db-economy.js
```

## Structure
- `frontend/` : app web statique (HTML/CSS/JS)
- `frontend/data/economy.json` : snapshot economie PoE2DB
- `ops/` : scripts d'operations (collecte data)
- `docs/` : notes projet
- `.github/workflows/` : CI/CD GitHub Pages

## Repo
- `https://github.com/sNking06/poe2-craft-mentor`
