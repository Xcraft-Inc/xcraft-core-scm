# 📘 xcraft-core-scm

## Aperçu

Le module `xcraft-core-scm` fournit une abstraction unifiée pour les systèmes de gestion de version (SCM - Source Control Management) dans l'écosystème Xcraft. Il propose des backends pour Git et SVN, permettant de cloner des dépôts, récupérer des références et gérer les sous-modules de manière transparente.

## Sommaire

- [Structure du module](#structure-du-module)
- [Fonctionnement global](#fonctionnement-global)
- [Exemples d'utilisation](#exemples-dutilisation)
- [Interactions avec d'autres modules](#interactions-avec-dautres-modules)
- [Variables d'environnement](#variables-denvironnement)
- [Détails des sources](#détails-des-sources)

## Structure du module

Le module s'organise autour d'un système de backends modulaires :

- **Point d'entrée** (`index.js`) : Charge dynamiquement tous les backends disponibles
- **Backend Git** (`backends/git.js`) : Implémentation complète pour Git avec support du cache et des sous-modules
- **Backend SVN** (`backends/svn.js`) : Implémentation pour Subversion avec gestion des externals

Chaque backend expose une interface commune avec les méthodes `clone`, `remoteRef` et optionnellement `localRef`.

## Fonctionnement global

Le module utilise un pattern de chargement dynamique des backends. Au démarrage, il scanne le dossier `backends/` et charge automatiquement tous les fichiers JavaScript comme backends SCM disponibles.

Chaque backend implémente :

- **clone** : Clone un dépôt vers une destination locale
- **remoteRef** : Récupère une référence distante (commit, révision)
- **localRef** : Récupère la référence locale actuelle (Git uniquement)

Le backend Git inclut des optimisations avancées comme :

- Un système de cache local pour éviter les téléchargements répétés
- La gestion intelligente des sous-modules Git
- Un mécanisme de limitation temporelle pour les opérations de cache

## Exemples d'utilisation

```javascript
const xScm = require('xcraft-core-scm');

// Cloner un dépôt Git avec sous-modules
const gitRef = await xScm.git.clone(
  {
    uri: 'https://github.com/user/repo.git',
    ref: 'main',
    out: '/path/to/destination',
    externals: true,
  },
  resp
);

// Cloner un dépôt SVN
const svnRef = await xScm.svn.clone(
  {
    uri: 'https://svn.example.com/repo/trunk',
    ref: '1234',
    out: '/path/to/destination',
    externals: false,
  },
  resp
);

// Récupérer une référence distante
const remoteCommit = await xScm.git.remoteRef(
  'https://github.com/user/repo.git',
  'refs/heads/main',
  resp
);

// Récupérer la référence locale
const localCommit = await xScm.git.localRef('/path/to/repo', resp);
```

## Interactions avec d'autres modules

Le module `xcraft-core-scm` s'intègre étroitement avec l'écosystème Xcraft :

- **[xcraft-core-process]** : Exécution des commandes Git et SVN avec parsing spécialisé
- **[xcraft-core-fs]** : Opérations sur le système de fichiers pour le chargement des backends
- **[xcraft-core-etc]** : Accès à la configuration Xcraft pour les répertoires temporaires
- **[xcraft-core-subst]** : Gestion des répertoires temporaires pour SVN

## Variables d'environnement

| Variable        | Description                                               | Exemple          | Valeur par défaut |
| --------------- | --------------------------------------------------------- | ---------------- | ----------------- |
| `GIT_CACHE_DIR` | Répertoire de cache Git pour optimiser les clones répétés | `/tmp/git-cache` | Non défini        |

## Détails des sources

### `index.js`

Point d'entrée du module qui implémente un système de chargement dynamique des backends. Il scanne le dossier `backends/` et expose chaque backend comme propriété de l'objet exporté.

### `backends/git.js`

Backend Git complet avec fonctionnalités avancées :

#### Fonctionnalités principales

- **Clonage optimisé** : Support du cache Git pour éviter les téléchargements répétés
- **Gestion des sous-modules** : Clone récursif avec référence au cache
- **Limitation temporelle** : Classe `OnceByDay` pour limiter les opérations de cache à une fois par jour par dépôt
- **Configuration longpaths** : Support automatique des chemins longs sur Windows

#### Méthodes publiques

- **`clone(options, resp)`** — Clone un dépôt Git vers la destination spécifiée avec support des sous-modules et du cache. L'option `externals` contrôle le traitement des sous-modules.
- **`remoteRef(remote, refname, resp)`** — Récupère le hash de commit d'une référence distante spécifique.
- **`localRef(location, resp)`** — Récupère le hash de commit de la référence locale (HEAD) dans un dépôt existant.

#### Optimisations de performance

Le backend Git utilise plusieurs stratégies d'optimisation :

- Cache local avec `git cache` pour éviter les téléchargements répétés
- Clonage parallèle avec `--jobs 2`
- Référence au cache avec `--reference-if-able`
- Limitation des opérations de cache à une fois par jour par dépôt via la classe `OnceByDay`

#### Gestion du cache

La classe `OnceByDay` implémente un mécanisme de limitation temporelle qui s'assure qu'un dépôt donné n'est mis à jour dans le cache qu'une seule fois par jour, optimisant ainsi les performances lors de multiples opérations sur le même dépôt.

### `backends/svn.js`

Backend Subversion avec support des externals :

#### Fonctionnalités principales

- **Checkout sécurisé** : Ignore automatiquement les erreurs de certificats SSL
- **Support des externals** : Option pour inclure ou exclure les dépendances externes
- **Gestion des révisions** : Support des révisions numériques et HEAD
- **Gestion temporaire** : Utilise `xcraft-core-subst` pour la gestion sécurisée des répertoires temporaires

#### Méthodes publiques

- **`clone(options, resp)`** — Effectue un checkout SVN vers la destination spécifiée avec gestion des externals selon l'option fournie.
- **`remoteRef(remote, refname, resp)`** — Récupère le numéro de révision d'un dépôt distant.

#### Gestion des certificats

Le backend SVN utilise l'option `--trust-server-cert-failures=unknown-ca,cn-mismatch,expired,not-yet-valid,other` pour ignorer automatiquement les problèmes de certificats courants dans les environnements d'entreprise, évitant les blocages lors des opérations de checkout.

---

_Documentation mise à jour_

[xcraft-core-process]: https://github.com/Xcraft-Inc/xcraft-core-process
[xcraft-core-fs]: https://github.com/Xcraft-Inc/xcraft-core-fs
[xcraft-core-etc]: https://github.com/Xcraft-Inc/xcraft-core-etc
[xcraft-core-subst]: https://github.com/Xcraft-Inc/xcraft-core-subst
