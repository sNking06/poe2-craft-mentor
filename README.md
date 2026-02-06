# POE2 Craft Mentor

Assistant de craft POE2 en local, deploye automatiquement sur GitHub Pages.

## Objectif
Guider les joueurs debutants et avances pour:
- choisir une strategie de craft selon la situation
- prioriser les bons mods
- estimer risque, cout et valeur du craft

## Fonctionnalites V1
- Formulaire de craft complet (mode debutant/avance)
- Type de degats (physique, feu, froid, foudre, chaos, minions, mixte)
- Budget exact en Divines
- Priorites de mods par slot et objectif
- Checklist avant craft
- Plan de craft pas a pas
- Scores: puissance, risque, pression cout
- Historique local
- Favoris
- Guide rapide anti-erreurs

## Structure
- `01_docs` : notes produit et cadrage
- `02_source/frontend` : application web statique (HTML/CSS/JS)
- `02_source/backend` : reserve pour evolutions API
- `03_tests` : tests futurs
- `04_assets` : ressources visuelles
- `05_exploitation` : scripts/process de livraison
- `06_livraison` : sorties versionnees

## Lancer en local
1. Ouvrir `02_source/frontend/index.html` dans le navigateur.

## Deployment GitHub Pages
Le repo contient deja le workflow:
- `.github/workflows/pages.yml`

A chaque push sur `main`, le site est deploye via GitHub Actions.

## URL repo
- `https://github.com/sNking06/poe2-craft-mentor`

## Roadmap courte
- V1.1: export/import JSON des plans
- V1.2: regles plus fines par archetype de build
- V2: backend optionnel pour synchro multi-devices
