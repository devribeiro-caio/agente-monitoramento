const DomainCategory = require('./models/DomainCategory');

let cache = new Map();
let loadedAt = 0;

async function load() {
  const all = await DomainCategory.find().lean();
  cache = new Map(all.map(d => [d.domain, d]));
  loadedAt = Date.now();
}

// youtube.com, m.youtube.com, music.youtube.com -> mesma regra
async function categorize(domain) {
  if (Date.now() - loadedAt > 60_000) await load();
  const parts = domain.split('.');
  for (let i = 0; i < parts.length - 1; i++) {
    const hit = cache.get(parts.slice(i).join('.'));
    if (hit) return { category: hit.category, productivity: hit.productivity };
  }
  return { category: 'uncategorized', productivity: 'neutral' };
}

async function seed() {
  if (await DomainCategory.countDocuments()) return;
  const rows = [
    ['youtube.com', 'streaming', 'unproductive'], ['netflix.com', 'streaming', 'unproductive'],
    ['facebook.com', 'social', 'unproductive'], ['instagram.com', 'social', 'unproductive'],
    ['tiktok.com', 'social', 'unproductive'], ['x.com', 'social', 'unproductive'],
    ['linkedin.com', 'social', 'neutral'], ['mercadolivre.com.br', 'shopping', 'unproductive'],
    ['amazon.com.br', 'shopping', 'unproductive'], ['g1.globo.com', 'news', 'neutral'],
    ['github.com', 'work', 'productive'], ['stackoverflow.com', 'work', 'productive'],
    ['docs.google.com', 'work', 'productive'], ['office.com', 'work', 'productive'],
    ['outlook.office.com', 'work', 'productive'], ['teams.microsoft.com', 'work', 'productive'],
  ];
  await DomainCategory.insertMany(rows.map(([domain, category, productivity]) => ({ domain, category, productivity })));
}

module.exports = { categorize, seed, reload: load };
