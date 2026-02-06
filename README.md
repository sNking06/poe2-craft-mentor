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

## Nouveautes V1.1 ✨
### Corrections de bugs
- ✅ Validation robuste des inputs (budget et item level)
- ✅ Gestion d'erreurs localStorage (quota depassee, stockage desactive)
- ✅ Deduplication des favoris (impossible d'ajouter 2x le meme plan)
- ✅ Confirmations avant suppression (historique/favoris)

### Ameliorations UX
- ✅ Restauration de plans depuis historique/favoris (clic sur carte)
- ✅ Suppression individuelle d'items (bouton X sur chaque carte)
- ✅ Cartes cliquables interactives pour historique/favoris
- ✅ Indicateur visuel "Deja en favoris" sur le bouton
- ✅ Feedback code couleur (succes/erreur/info)

### Qualite du code
- ✅ Constantes extraites et documentees (SCORE_LOW, SCORE_MEDIUM, etc.)
- ✅ Documentation JSDoc complete sur toutes les fonctions
- ✅ Formules de score commentees et expliquees
- ✅ Separation config/logique amelioree
- ✅ Code refactorise et plus maintenable

### Nouvelles features
- ✅ Export JSON des plans (telecharge un fichier .json)
- ✅ Import JSON des plans (restaure depuis fichier)
- ✅ Suite de tests unitaires (20 tests couvrant la logique metier)
- ✅ Test runner HTML (execute les tests dans le navigateur)

## Structure
- `docs` : notes produit et cadrage
- `frontend` : application web statique (HTML/CSS/JS)
- `backend` : reserve pour evolutions API
- `tests` : tests futurs
- `assets` : ressources visuelles
- `ops` : scripts/process de livraison
- `releases` : sorties versionnees

## Lancer en local
1. Ouvrir `frontend/index.html` dans le navigateur.

## Lancer les tests
### Option 1: Node.js
```bash
cd tests
node craft-logic.test.js
```

### Option 2: Navigateur
1. Ouvrir `tests/test-runner.html` dans le navigateur
2. Cliquer sur "Run Tests"

Tous les tests doivent passer (20/20).

## Deployment GitHub Pages
Le repo contient deja le workflow:
- `.github/workflows/pages.yml`

A chaque push sur `main`, le site est deploye via GitHub Actions.

## URL repo
- `https://github.com/sNking06/poe2-craft-mentor`

## Backlog V1.2 (Ameliorations futures)
- Recherche/filtre dans l'historique et favoris
- Tri personnalise de l'historique (date, budget, slot, etc.)
- Tags personnalises pour les plans
- Mode sombre (dark mode)
- Comparaison de 2 plans cote a cote
- Suggestions de craft basees sur le meta actuel
- Integration donnees POE2 Ninja (prix des mats)
- Regles plus fines par archetype de build
- PWA (Progressive Web App) pour utilisation offline

## Roadmap long terme
- V2: backend optionnel pour synchro multi-devices
- V2: partage de plans via URL
- V2: communaute de plans (vote, commentaires)
