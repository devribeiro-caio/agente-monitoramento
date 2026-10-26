// Configuração enviada aos agentes no heartbeat.
const DEFAULT_EXCLUDED_DOMAINS = [
  // bancos
  'nubank.com.br', 'itau.com.br', 'bradesco.com.br', 'santander.com.br',
  'caixa.gov.br', 'bb.com.br', 'inter.co', 'c6bank.com.br',
  // saúde / sensíveis
  'einstein.br', 'sirio-libanes.org.br',
];
const DEFAULT_EXCLUDED_APPS = ['keepass.exe', '1password.exe', 'bitwarden.exe'];

const extra = (process.env.EXCLUDED_DOMAINS || '')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

const excludedDomains = [...new Set([...DEFAULT_EXCLUDED_DOMAINS, ...extra])];

function matchesDomain(domain, list) {
  return list.some(d => domain === d || domain.endsWith('.' + d));
}

module.exports = {
  excludedDomains,
  excludedApps: DEFAULT_EXCLUDED_APPS,
  agentConfig: () => ({
    excludedDomains,
    excludedApps: DEFAULT_EXCLUDED_APPS,
    idleSeconds: 120,
    trackIntervalSec: 5,
    syncIntervalSec: 60,
  }),
  matchesDomain,
  retentionDays: Number(process.env.RETENTION_DAYS || 90),
};
