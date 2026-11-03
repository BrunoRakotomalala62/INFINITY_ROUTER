# InfinityRouter API REST — 3 Routes

Wrapper REST autour de **InfinityRouter** (`https://infinityrouter.dev/v1`).

> Repo: https://github.com/BrunoRakotomalala62/INFINITY_ROUTER

## 🚀 Serveur LIVE
```
http://localhost:3000 → https://3000-{sandboxId}.e2b.app
```

## 📚 Les 3 routes demandées

### 1) `POST /api/text` — Texte seulement
Question texte → réponse texte. Pas d'image.

**Body:**
```json
{
  "message": "Explique le théorème de Pythagore",
  "model": "deepseek-v4.1-flash-1017",
  "max_tokens": 500
}
```
```bash
curl -X POST http://localhost:3000/api/text \
  -H "Content-Type: application/json" \
  -d '{"message":"Explique Pythagore en 2 phrases"}'
```

### 2) `POST /api/vision` — Texte + Image
Envoie un message + une image (base64 `data:image/...` ou URL https) → analyse visuelle.

```json
{
  "message": "Que vois-tu sur cette image ?",
  "image": "data:image/png;base64,iVBORw0K...",
  "model": "claude-haiku-5-5"
}
```
```bash
curl -X POST http://localhost:3000/api/vision \
  -d '{"message":"Décris cette figure","image":"https://example.com/triangle.jpg"}'
```

### 3) `POST /api/auto` — Auto + Figure SVG ⭐
**Route intelligente :** détecte automatiquement si l'utilisateur veut une figure.

- Scanne `message` pour : `figure`, `triangle`, `dessine`, `schéma`, `cercle`, `géométrie`, `ABC`, `semblable`...
- Si détecté → injecte un *system prompt* qui force la génération d'un **SVG complet** + renvoie `svg` séparé
- Sinon → comportement normal texte/vision
- Supporte aussi `image` optionnelle (ex: corrige ma figure)

```json
{
  "message": "Fais une figure de deux triangles semblables ABC et RST",
  "model": "claude-haiku-5-5"
}
```
**Réponse:**
```json
{
  "route": "auto",
  "figureDetected": true,
  "figureKeywords": ["figure","triangle","semblable"],
  "model": "claude-haiku-5-5",
  "text": "Voici deux triangles... ```svg <svg>...</svg>```",
  "svg": "<svg xmlns=...></svg>",
  "hasSvg": true
}
```
```bash
curl -X POST http://localhost:3000/api/auto \
  -d '{"message":"Fais une figure de deux triangles semblables ABC et RST avec labels et k=1.5"}'
```

## 🔧 Autres endpoints
- `GET /api/health` → état + liste routes
- `GET /api/models` → liste modèles InfinityRouter

## 🔑 Clé API
Par défaut utilise `INFINITYROUTER_KEY` du `.env`. Override par requête :
```
X-API-Key: ta_nouvelle_cle
```

## 📦 Lancer
```bash
npm install
node server.js
# ou
PORT=3000 node server.js
```

## 🎨 Frontend de test
Ouvre `http://localhost:3000` — interface 3 routes avec aperçu SVG + téléchargement.

## 🔒 Sécurité
Le fichier `.env` (avec la vraie clé) est ignoré via `.gitignore` — seul `.env.example` est versionné.
