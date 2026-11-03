import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const BASE = process.env.INFINITYROUTER_BASE || 'https://infinityrouter.dev/v1';
const DEFAULT_KEY = process.env.INFINITYROUTER_KEY;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Helpers
const FIGURE_KEYWORDS = ['figure','triangle','dessine','dessiner','schéma','schema','graphe','tracer','construire','cercle','rectangle','géométrie','geometrie','fais une figure','faire une figure','illustre','similitude','semblable','abc','rst'];

function needsFigure(text = '') {
  const lower = text.toLowerCase();
  return FIGURE_KEYWORDS.some(k => lower.includes(k));
}

async function callInfinity({ model, messages, max_tokens = 800, apiKey }) {
  const key = apiKey || DEFAULT_KEY;
  if (!key) throw new Error('INFINITYROUTER_KEY manquant');
  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, max_tokens })
  });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data?.error?.message || 'Erreur InfinityRouter'), { status: res.status, data });
  return data;
}

function extractSvg(text) {
  const match = text.match(/<svg[\s\S]*?<\/svg>/i);
  return match ? match[0] : null;
}

// Health
app.get('/api/health', (req,res)=>{
  res.json({ ok:true, service:'InfinityRouter Wrapper', base: BASE, models:['deepseek-v4.1-flash-1017','minimax-m3.1-flash','claude-haiku-5-5'], routes:['POST /api/text','POST /api/vision','POST /api/auto'] });
});

app.get('/api/models', async (req,res)=>{
  try {
    const key = req.headers['x-api-key'] || DEFAULT_KEY;
    const r = await fetch(`${BASE}/models`, { headers:{ 'Authorization':`Bearer ${key}` }});
    const j = await r.json();
    res.json(j);
  } catch(e){ res.status(500).json({ error:e.message }); }
});

/**
 * ROUTE 1 : TEXTE SEULEMENT
 * POST /api/text
 * body: { message: string, model?: string, max_tokens?: number }
 */
app.post('/api/text', async (req,res)=>{
  try {
    const { message, model='deepseek-v4.1-flash-1017', max_tokens } = req.body;
    if(!message) return res.status(400).json({ error:'message requis' });
    const data = await callInfinity({
      model,
      messages:[{ role:'user', content: message }],
      max_tokens: max_tokens || 500,
      apiKey: req.headers['x-api-key']
    });
    const text = data.choices?.[0]?.message?.content || '';
    res.json({ route:'text', model: data.model, text, usage: data.usage, id: data.id });
  } catch(e){ res.status(e.status||500).json({ error:e.message, details:e.data }); }
});

/**
 * ROUTE 2 : TEXTE + IMAGE (Vision)
 * POST /api/vision
 * body: { message: string, image: string (data URL ou https URL), model?: string }
 * image peut être base64 data:image/... ou url https
 */
app.post('/api/vision', async (req,res)=>{
  try {
    const { message, image, image_url, model='claude-haiku-5-5', max_tokens } = req.body;
    const img = image || image_url;
    if(!message) return res.status(400).json({ error:'message requis' });
    if(!img) return res.status(400).json({ error:'image ou image_url requis (data URL base64 ou https)' });

    const content = [
      { type:'text', text: message },
      { type:'image_url', image_url:{ url: img } }
    ];
    const data = await callInfinity({
      model,
      messages:[{ role:'user', content }],
      max_tokens: max_tokens || 600,
      apiKey: req.headers['x-api-key']
    });
    const text = data.choices?.[0]?.message?.content || '';
    res.json({ route:'vision', model: data.model, text, usage: data.usage, id: data.id });
  } catch(e){ res.status(e.status||500).json({ error:e.message, details:e.data }); }
});

/**
 * ROUTE 3 : AUTO - TEXTE + IMAGE + FIGURE AUTOMATIQUE
 * POST /api/auto
 * body: { message: string, image?: string, model?: string }
 * Si le message contient un mot-clé de figure -> génère automatiquement un SVG en plus
 */
app.post('/api/auto', async (req,res)=>{
  try {
    const { message, image, image_url, model, max_tokens } = req.body;
    if(!message) return res.status(400).json({ error:'message requis' });
    
    const img = image || image_url || null;
    const shouldMakeFigure = needsFigure(message);
    
    // Modèle par défaut : claude pour figure (meilleur SVG), sinon deepseek
    const chosenModel = model || (shouldMakeFigure ? 'claude-haiku-5-5' : 'deepseek-v4.1-flash-1017');

    let messages;
    if (shouldMakeFigure) {
      // Prompt enrichi pour forcer la génération de figure SVG
      const figureInstruction = `Tu es un assistant géométrie. L'utilisateur demande une figure. 
Tu dois répondre en 2 parties:
1) Une explication courte en français
2) Puis un bloc code SVG complet \`\`\`svg ... \`\`\` représentant la figure demandée.
Contraintes SVG: viewBox 0 0 600 320, fond blanc, couleurs douces, labels lisibles, traits nets.`;
      
      if (img) {
        messages = [
          { role:'system', content: figureInstruction },
          { role:'user', content: [
            { type:'text', text: message },
            { type:'image_url', image_url:{ url: img } }
          ]}
        ];
      } else {
        messages = [
          { role:'system', content: figureInstruction },
          { role:'user', content: message }
        ];
      }
    } else {
      // Pas de figure : comportement normal vision/texte
      if (img) {
        messages = [{ role:'user', content:[
          { type:'text', text: message },
          { type:'image_url', image_url:{ url: img } }
        ]}];
      } else {
        messages = [{ role:'user', content: message }];
      }
    }

    const data = await callInfinity({
      model: chosenModel,
      messages,
      max_tokens: max_tokens || 900,
      apiKey: req.headers['x-api-key']
    });
    const text = data.choices?.[0]?.message?.content || '';
    const svg = shouldMakeFigure ? extractSvg(text) : null;

    res.json({
      route:'auto',
      figureDetected: shouldMakeFigure,
      figureKeywords: shouldMakeFigure ? FIGURE_KEYWORDS.filter(k=> message.toLowerCase().includes(k)) : [],
      model: data.model,
      text,
      svg, // null si pas de figure
      hasSvg: !!svg,
      usage: data.usage,
      id: data.id
    });
  } catch(e){ res.status(e.status||500).json({ error:e.message, details:e.data }); }
});

// Fallback SPA
app.get('*', (req,res)=>{
  res.sendFile(path.join(__dirname,'public','index.html'));
});

app.listen(PORT, '0.0.0.0', ()=>{
  console.log(`✅ API REST InfinityRouter lancée sur http://0.0.0.0:${PORT}`);
  console.log(`Routes: POST /api/text | POST /api/vision | POST /api/auto`);
});
