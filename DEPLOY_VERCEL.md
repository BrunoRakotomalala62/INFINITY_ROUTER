# Déployer sur Vercel (vercel.com)

## 1. Importer le repo
1. Va sur https://vercel.com/new
2. Connecte ton GitHub → sélectionne `BrunoRakotomalala62/INFINITY_ROUTER`
3. Vercel détecte automatiquement `vercel.json` et `package.json`

## 2. Configurer les variables d'environnement
Dans Vercel → Project → Settings → Environment Variables, ajoute :

| Nom | Valeur |
|-----|--------|
| `INFINITYROUTER_KEY` | `RP490qjF7PG6WQk117PpG0Hr6WfmeEUDhjcovxq1RW2FXY40` |
| `INFINITYROUTER_BASE` | `https://infinityrouter.dev/v1` |
| `PORT` | `3000` (optionnel, Vercel gère) |

> ⚠️ Ne committed jamais `.env` — il est déjà dans `.gitignore`. Seul `.env.example` est sur GitHub.

## 3. Déployer
Clique `Deploy` → Vercel build avec `@vercel/node` → ton API sera en ligne sur `https://ton-projet.vercel.app`

## 4. Tester en prod
```bash
curl https://ton-projet.vercel.app/api/health

curl -X POST https://ton-projet.vercel.app/api/auto \
  -H "Content-Type: application/json" \
  -d '{"message":"Fais une figure de deux triangles semblables ABC et RST"}'
```

## 5. Domaine
Tu peux ajouter un domaine custom dans Vercel → Settings → Domains.

## Fichier vercel.json inclus
```json
{
  "version": 2,
  "builds": [
    { "src": "server.js", "use": "@vercel/node" },
    { "src": "public/**", "use": "@vercel/static" }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "server.js" },
    { "src": "/(.*)", "dest": "server.js" }
  ]
}
```
