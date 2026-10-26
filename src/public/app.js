const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const state = { key: sessionStorage.getItem('formis.adminKey') || '', employees: [], report: null, toastTimer: null };
const localHost = ['localhost', '127.0.0.1', '::1'].includes(location.hostname.toLowerCase());
if (localHost) { state.key = ''; sessionStorage.removeItem('formis.adminKey'); $('#signout').hidden = true; }
const productivity = {
  productive: { label: 'Produtivo', color: '#2870bd' },
  neutral: { label: 'Neutro', color: '#f2a93b' },
  unproductive: { label: 'Não produtivo', color: '#dfe8f0' },
};
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const initials = name => String(name || '?').trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
function notify(message, error = false) {
  const toast = $('#toast'); toast.textContent = message; toast.classList.toggle('error', error); toast.classList.add('show');
  clearTimeout(state.toastTimer); state.toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}
async function api(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', 'x-admin-key': state.key, ...(options.headers || {}) } });
  const payload = await response.json().catch(() => ({}));
  if (response.status === 401) { sessionStorage.removeItem('formis.adminKey'); state.key = ''; throw new Error('Chave administrativa ausente ou inválida. Informe novamente.'); }
  if (!response.ok) throw new Error(payload.error || 'Não foi possível concluir a solicitação.');
  return payload;
}
function askForKey() {
  const answer = window.prompt('Informe a chave de administração para acessar o painel:');
  if (answer === null || !answer.trim()) return false;
  state.key = answer.trim(); sessionStorage.setItem('formis.adminKey', state.key); return true;
}
async function withAuth(action) {
  if (!localHost && !state.key && !askForKey()) return;
  try { return await action(); }
  catch (error) {
    if (!state.key && error.message.includes('Chave administrativa')) { notify(error.message, true); if (askForKey()) return withAuth(action); }
    else notify(error.message, true);
  }
}
function formatTime(seconds = 0) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  if (total < 3600) return `${Math.floor(total / 60)} min`;
  const hours = Math.floor(total / 3600), minutes = Math.floor(total % 3600 / 60);
  return minutes ? `${hours}h ${minutes}min` : `${hours}h`;
}
function dateLabel(day) { return new Date(`${day}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''); }
function formatLastSeen(value) {
  if (!value) return 'Sem contato registrado';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Sem contato registrado' : date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}
function renderEmployees() {
  const filter = $('#employee-filter'), selected = filter.value;
  filter.innerHTML = '<option value="">Selecione colaborador</option>' + state.employees.map(employee => `<option value="${esc(employee._id)}">${esc(employee.name)}</option>`).join('');
  if (state.employees.some(person => String(person._id) === selected)) filter.value = selected;
  if (!filter.value && state.employees.length) filter.value = state.employees[0]._id;
  $('#stat-employees').textContent = state.employees.length;
  $('#stat-devices').textContent = state.employees.reduce((total, person) => total + (person.devices || []).length, 0);
  drawEmployeeRows();
}
function drawEmployeeRows() {
  const term = ($('#employee-search')?.value || '').trim().toLowerCase();
  const ipTerm = ($('#ip-search')?.value || '').trim().toLowerCase();
  const people = state.employees.map(person => {
    const allDevices = person.devices || [];
    const devices = ipTerm ? allDevices.filter(device => String(device.currentIp || '').toLowerCase().includes(ipTerm)) : allDevices;
    const searchable = `${person.name} ${person.email} ${person.department || ''} ${allDevices.map(device => `${device.hostname || ''} ${device.currentIp || ''}`).join(' ')}`.toLowerCase();
    return { person, devices, visible: searchable.includes(term) && (!ipTerm || devices.length > 0) };
  }).filter(entry => entry.visible);
  $('#employee-count').textContent = ipTerm ? `${people.length} resultado(s) para IP “${ipTerm}”` : `${people.length} ${people.length === 1 ? 'colaborador' : 'colaboradores'}`;
  const rows = people.map(({ person, devices }) => {
    const deviceMarkup = devices.length ? devices.map(device => `<div class="device-entry"><span class="device-meta"><strong>${esc(device.hostname || 'Dispositivo')}</strong><small>IP observado: ${esc(device.currentIp || 'Não informado')}</small><small>Último contato: ${esc(formatLastSeen(device.lastSeen))}</small></span><button class="small-action danger" data-revoke="${esc(device._id)}" type="button">Revogar</button></div>`).join('') : '<span class="muted">Nenhum dispositivo</span>';
    return `<tr><td><div class="person-cell"><span class="person-avatar">${esc(initials(person.name))}</span><span><strong>${esc(person.name)}</strong><small>${esc(person.email)}</small></span></div></td><td>${esc(person.department || '—')}</td><td>${deviceMarkup}</td><td><span class="status-badge"><i></i> Ativo</span></td><td><div class="row-actions"><button class="small-action" data-enroll="${esc(person._id)}" type="button">＋ Ativar dispositivo</button></div></td></tr>`;
  }).join('');
  $('#employee-rows').innerHTML = rows || `<tr><td colspan="5" class="empty-cell">${state.employees.length ? 'Nenhum resultado para esta busca.' : 'Nenhum colaborador cadastrado.'}</td></tr>`;
}
function renderRanking(target, items, nameKey, max) {
  const root = $(target);
  if (!items?.length) { root.innerHTML = '<div class="empty-state">Sem dados no período.</div>'; return; }
  root.innerHTML = items.slice(0, 5).map(item => `<div class="ranking-item"><span class="ranking-name" title="${esc(item._id || 'Sem categoria')}">${esc(item._id || 'Sem categoria')}</span><span class="rank-track"><i style="width:${Math.max(4, Math.round((item.totalSec / max) * 100))}%"></i></span><span class="rank-time">${formatTime(item.totalSec)}</span></div>`).join('');
}
function renderReport(report) {
  state.report = report;
  const days = report.perDay || [], values = days.map(day => Number(day.activeSec) || 0), max = Math.max(...values, 1);
  const total = values.reduce((sum, value) => sum + value, 0);
  $('#stat-time').textContent = formatTime(total);
  const productivityData = report.byProductivity || [];
  const productiveSeconds = productivityData.find(item => item._id === 'productive')?.totalSec || 0;
  const classified = productivityData.reduce((sum, item) => sum + (Number(item.totalSec) || 0), 0);
  const focus = classified ? Math.round(productiveSeconds / classified * 100) : 0;
  $('#stat-focus').textContent = `${focus}%`;
  $('#activity-caption').textContent = `Atividade diária · ${new Date(report.from).toLocaleDateString('pt-BR')} a ${new Date(report.to).toLocaleDateString('pt-BR')}`;
  $('#activity-chart').innerHTML = days.length ? days.map(day => {
    const height = Math.max(2, Math.round((Number(day.activeSec) / max) * 100));
    return `<div class="chart-column"><span class="bar-value">${esc(formatTime(day.activeSec))}</span><div class="bar" style="--bar-height:${height}%" title="${esc(formatTime(day.activeSec))}"></div><label>${esc(dateLabel(day._id))}</label></div>`;
  }).join('') : '<div class="empty-state">Sem atividade registrada no período.</div>';
  const donutParts = productivityData.map(item => ({ key: item._id, value: Number(item.totalSec) || 0 })).filter(item => productivity[item.key] && item.value);
  if (!donutParts.length) {
    $('#focus-chart').style.background = '#eaf0f5'; $('#focus-chart').innerHTML = '<div class="donut-label"><strong>—</strong>sem dados</div>'; $('#focus-legend').innerHTML = '';
  } else {
    let cursor = 0;
    const segments = donutParts.map(item => { const start = cursor; cursor += item.value / classified * 100; return `${productivity[item.key].color} ${start}% ${cursor}%`; }).join(', ');
    $('#focus-chart').style.background = `conic-gradient(${segments})`;
    $('#focus-chart').innerHTML = `<div class="donut-label"><strong>${esc(formatTime(classified))}</strong>navegação</div>`;
    $('#focus-legend').innerHTML = donutParts.map(item => `<span class="legend-item"><i style="--legend-color:${productivity[item.key].color}"></i>${esc(productivity[item.key].label)}</span>`).join('');
  }
  const domains = report.topDomains || [], apps = report.topApps || [];
  renderRanking('#top-sites', domains, '_id', Math.max(...domains.map(item => Number(item.totalSec) || 0), 1));
  renderRanking('#top-apps', apps, '_id', Math.max(...apps.map(item => Number(item.totalSec) || 0), 1));
}
async function loadReport() {
  const id = $('#employee-filter').value;
  if (!id) return renderReport({ from: new Date(), to: new Date(), perDay: [], byProductivity: [], topDomains: [], topApps: [] });
  const days = Number($('#range-filter').value || 7), to = new Date(), from = new Date(Date.now() - days * 86400000);
  const query = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
  const report = await api(`/api/admin/reports/employee/${encodeURIComponent(id)}?${query}`);
  renderReport(report);
}
async function loadDashboard() {
  const employees = await api('/api/admin/employees'); state.employees = employees;
  renderEmployees(); await loadReport();
}
function showModal(id) { const modal = $(`#${id}`); modal.hidden = false; const focusable = $('input', modal); if (focusable) setTimeout(() => focusable.focus(), 50); }
function closeModal(id) { $(`#${id}`).hidden = true; }
function setView(name) {
  const allowed = ['dashboard', 'equipe', 'categorias'].includes(name) ? name : 'dashboard';
  $$('.view').forEach(view => { const active = view.id === `view-${allowed}`; view.hidden = !active; view.classList.toggle('active', active); });
  $$('.nav-link').forEach(link => link.classList.toggle('active', link.dataset.view === allowed));
  $('#crumb-title').textContent = ({ dashboard: 'Visão geral', equipe: 'Colaboradores', categorias: 'Categorias' })[allowed];
  if (allowed === 'equipe') drawEmployeeRows();
}
$$('[data-view]').forEach(link => link.addEventListener('click', event => { event.preventDefault(); const view = link.dataset.view; location.hash = view; setView(view); }));
$('#open-employee').addEventListener('click', () => showModal('employee-modal'));
$$('[data-close]').forEach(button => button.addEventListener('click', () => closeModal(button.dataset.close)));
$$('.modal-backdrop').forEach(backdrop => backdrop.addEventListener('click', event => { if (event.target === backdrop) closeModal(backdrop.id); }));
$('#employee-form').addEventListener('submit', event => {
  event.preventDefault(); const form = event.currentTarget, data = Object.fromEntries(new FormData(form));
  $('#employee-error').textContent = '';
  withAuth(async () => { const button = $('button[type="submit"]', form); button.disabled = true; try { await api('/api/admin/employees', { method: 'POST', body: JSON.stringify(data) }); form.reset(); closeModal('employee-modal'); notify('Colaborador cadastrado.'); await loadDashboard(); } catch (error) { $('#employee-error').textContent = error.message; } finally { button.disabled = false; } });
});
$('#employee-rows').addEventListener('click', event => {
  const enroll = event.target.closest('[data-enroll]'), revoke = event.target.closest('[data-revoke]');
  if (enroll) withAuth(async () => { const result = await api(`/api/admin/employees/${encodeURIComponent(enroll.dataset.enroll)}/enroll-code`, { method: 'POST' }); $('#activation-code').textContent = result.code; $('#code-expiry').textContent = `Válido por ${result.expiresInHours} horas · uso único`; showModal('code-modal'); });
  if (revoke && window.confirm('Revogar o acesso deste dispositivo? Ele deixará de sincronizar os dados.')) withAuth(async () => { await api(`/api/admin/devices/${encodeURIComponent(revoke.dataset.revoke)}`, { method: 'DELETE' }); notify('Acesso ao dispositivo revogado.'); await loadDashboard(); });
});
$('#copy-code').addEventListener('click', async () => { try { await navigator.clipboard.writeText($('#activation-code').textContent); notify('Código copiado.'); } catch { notify('Não foi possível copiar; selecione o código manualmente.', true); } });
$('#employee-filter').addEventListener('change', () => withAuth(loadReport));
$('#range-filter').addEventListener('change', () => withAuth(loadReport));
$('#employee-search').addEventListener('input', drawEmployeeRows);
$('#ip-search').addEventListener('input', drawEmployeeRows);
$('#category-form').addEventListener('submit', event => {
  event.preventDefault(); const form = event.currentTarget, data = Object.fromEntries(new FormData(form));
  withAuth(async () => { await api('/api/admin/categories', { method: 'PUT', body: JSON.stringify(data) }); form.reset(); notify('Regra de domínio salva.'); });
});
$('#signout').addEventListener('click', () => {
  state.key = ''; state.employees = []; sessionStorage.removeItem('formis.adminKey'); renderEmployees();
  $('#stat-time').textContent = '—'; $('#stat-focus').textContent = '—';
  renderReport({ from: new Date(), to: new Date(), perDay: [], byProductivity: [], topDomains: [], topApps: [] });
  notify('Sessão encerrada.');
});
window.addEventListener('hashchange', () => setView(location.hash.slice(1)));
setView(location.hash.slice(1));
withAuth(loadDashboard);
