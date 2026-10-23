# 📦 Gestion des versions

Il y a deux notions de version :

- **Version applicative** (`1.0.2`) : champ `version` de `frontend/package.json`, recopié dans
  `public/manifest.json` et `public/version.json`. Elle change par les commandes ci-dessous.
- **Build** (`1.0.2-<horodatage>`) : calculé à chaque `pnpm run build` par `vite.config.js`. Il est
  injecté dans le bundle (`__APP_VERSION__`) et écrit dans `dist/version.json`, puis repris par
  `dist/sw.js`. C'est lui que l'application compare à `/version.json` pour proposer une mise à jour
  (voir [PWA-INSTALL.md](PWA-INSTALL.md)). `public/version.json` ne sert qu'en développement.

## 📋 Commandes (dans `frontend/`)

```bash
pnpm run version:current    # affiche la version de package.json
pnpm run version:patch      # 1.0.2 -> 1.0.3
pnpm run version:minor      # 1.0.2 -> 1.1.0
pnpm run version:major      # 1.0.2 -> 2.0.0
```

`scripts/version-bump.js` :

1. met à jour `package.json`, `public/manifest.json` (`version`, `version_name`) et
   `public/version.json` ;
2. fait `git add` de ces trois fichiers, puis **crée lui-même un commit**
   `chore: bump version to X.Y.Z`. Si ce commit échoue, le script affiche les commandes à lancer
   à la main.

Penser à committer ses autres modifications avant, ou à ne pas avoir d'autres fichiers indexés :
ils partiraient dans ce commit.

## 🔄 Hooks Git (optionnels)

```bash
pnpm run setup:hooks   # installe .git/hooks/pre-commit et pre-push
```

- **pre-commit** (`scripts/pre-commit-hook.js`) : sur `main` ou `master` seulement, si aucun
  fichier de version n'est déjà indexé, il lance `version-bump.js patch` et ajoute les fichiers de
  version au commit. Sur les autres branches, il ne fait rien.
- **pre-push** : affiche la version courante.

Pour désactiver les hooks : supprimer `.git/hooks/pre-commit` (et `pre-push`). Comme
`version-bump.js` committe lui-même, l'incrémentation automatique depuis le hook pre-commit
déclenche un commit imbriqué. Il vaut mieux vérifier son comportement sur une branche de test, ou
incrémenter à la main avant de committer.

## 🔍 Vérifier

```bash
pnpm run version:current
git log --oneline --grep="chore: bump version"
curl https://<votre-domaine>/version.json      # build réellement déployé
```

La version déployée s'affiche aussi dans l'application (`VersionInfo`) et dans la notification de
mise à jour.
