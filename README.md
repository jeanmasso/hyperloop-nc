# 🚄 Hyperloop NC

> Système de transport révolutionnaire en Nouvelle-Calédonie

Une application web moderne développée avec Angular 19 qui simule un système de transport futuriste connectant toutes les îles de Nouvelle-Calédonie.

## 🌟 Fonctionnalités

### 🔍 **Recherche de Trajets**
- Interface de recherche intuitive avec sélection d'origine et destination
- Filtres avancés : classe de service, préférences horaires
- Échange rapide des stations avec un bouton dédié
- Résultats détaillés avec informations complètes sur les trajets

### 🕐 **Horaires**
- Consultation des horaires en temps réel
- Filtres par ligne, station et période
- Affichage optimisé des départs et arrivées
- Interface responsive pour tous les appareils

### 🚉 **Stations**
- Cartographie complète du réseau de transport
- Informations détaillées sur chaque station
- Connexions et lignes disponibles
- Localisation géographique par île

### 💰 **Tarifs**
- Grille tarifaire complète entre toutes les stations
- Tarification par classe de service (1ère, 2ème, 3ème classe)
- Calcul automatique des prix selon la distance
- Interface claire et organisée

### 🏠 **Page d'Accueil**
- Présentation du système Hyperloop NC
- Navigation rapide vers toutes les fonctionnalités
- Design moderne avec dégradés et animations
- Cartes interactives pour découvrir les services

## 🛠️ Technologies Utilisées

- **Frontend** : Angular 19 avec TypeScript
- **Styling** : Bootstrap 5 + CSS personnalisé
- **Gestion d'état** : RxJS avec Observables
- **Données** : Fichiers JSON statiques
- **Routing** : Angular Router
- **Tests** : Jasmine & Karma

## 📁 Structure du Projet

```
src/
├── app/
│   ├── components/          # Composants de l'application
│   │   ├── home-page/       # Page d'accueil
│   │   ├── search/          # Recherche de trajets
│   │   ├── schedules/       # Horaires
│   │   ├── stations/        # Stations
│   │   ├── prices/          # Tarifs
│   │   ├── header/          # En-tête
│   │   ├── footer/          # Pied de page
│   │   └── navigation/      # Navigation
│   ├── services/            # Services Angular
│   │   ├── data.service.ts  # Gestion des données
│   │   ├── search.service.ts # Logique de recherche
│   │   └── utils.service.ts # Utilitaires
│   ├── models/              # Modèles TypeScript
│   └── assets/              # Ressources statiques
└── public/
    └── data/                # Données JSON
        ├── stations.json    # Stations du réseau
        ├── lines.json       # Lignes de transport
        ├── schedules.json   # Horaires
        └── prices.json      # Grille tarifaire
```

## 🚀 Installation et Lancement

### Prérequis
- Node.js (version 18 ou supérieure)
- npm ou yarn
- Angular CLI 19

### Installation

```bash
# Cloner le repository
git clone [URL_DU_REPO]
cd hyperloop-nc

# Installer les dépendances
npm install

# Ou avec yarn
yarn install
```

### Développement

```bash
# Lancer le serveur de développement
npm start
# ou
ng serve

# L'application sera accessible sur http://localhost:4200
```

### Build de Production

```bash
# Créer un build de production
npm run build
# ou
ng build --prod

# Les fichiers seront générés dans le dossier dist/
```

## 🧪 Tests

```bash
# Exécuter les tests unitaires
npm test
# ou
ng test

# Exécuter les tests en mode watch
npm run test:watch
```

## 📱 Responsive Design

L'application est entièrement responsive et optimisée pour :
- 📱 **Mobile** : Interface adaptée aux petits écrans
- 📺 **Tablet** : Mise en page optimisée pour les tablettes
- 💻 **Desktop** : Expérience complète sur grand écran

## 🎨 Design System

### Couleurs Principales
- **Primaire** : `#667eea` (Bleu)
- **Secondaire** : `#764ba2` (Violet)
- **Succès** : `#28a745` (Vert)
- **Attention** : `#ffc107` (Jaune)
- **Erreur** : `#dc3545` (Rouge)

### Typographie
- **Police** : Segoe UI, Tahoma, Geneva, Verdana, sans-serif
- **Titres** : Bootstrap display-4 avec font-weight 700
- **Corps** : Taille 1rem avec line-height 1.6

## 🌍 Données de Transport

L'application simule un réseau de transport couvrant :

### Îles Desservies
- **Grande-Terre** : De Nouméa à Koumac
- **Îles Loyauté** : Lifou, Maré, Ouvéa
- **Île des Pins** : Connexion depuis Nouméa

### Classes de Service
- **🏆 Première Classe** : Service premium avec sièges inclinables
- **🚂 Deuxième Classe** : Confort standard avec climatisation
- **🎫 Troisième Classe** : Transport économique

## 👨‍💻 Développement

### Commandes Utiles

```bash
# Générer un nouveau composant
ng generate component nom-composant

# Générer un nouveau service
ng generate service nom-service

# Générer un nouveau module
ng generate module nom-module

# Linter le code
ng lint

# Analyser le bundle
ng build --stats-json
npx webpack-bundle-analyzer dist/hyperloop-nc/stats.json
```

### Standards de Code
- **TypeScript** strict mode activé
- **ESLint** pour la qualité du code
- **Prettier** pour le formatage
- **Conventional Commits** pour les messages de commit

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Commit les changements (`git commit -m 'Ajout nouvelle fonctionnalité'`)
4. Push sur la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est développé dans le cadre d'un projet académique pour la LP MIAW - Dev Front & Integration.

## 👤 Auteur

**Jean Masso**  
LP MIAW - Développement Front-end & Intégration  
Année académique 2025

## 📞 Support

Pour toute question ou suggestion concernant le projet :
- Ouvrir une issue sur GitHub
- Contacter l'équipe de développement

---

*Développé avec ❤️ en Angular pour révolutionner le transport en Nouvelle-Calédonie*
