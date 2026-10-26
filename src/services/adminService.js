const crypto = require('crypto');
const { Types } = require('mongoose');
const repository = require('../repositories/adminRepository');

function fail(message, statusCode = 400) { const error = new Error(message); error.statusCode = statusCode; throw error; }
async function createEmployee(input = {}) {
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const department = typeof input.department === 'string' ? input.department.trim() : '';
  if (!name || !email) fail('Nome e e-mail são obrigatórios.');
  if (!/^\S+@\S+\.\S+$/.test(email)) fail('Informe um e-mail válido.');
  try { return await repository.createEmployee({ name, email, department }); }
  catch (error) {
    if (error.code === 11000) fail('Já existe um colaborador cadastrado com este e-mail.', 409);
    throw error;
  }
}
async function generateEnrollmentCode(employeeId) {
  if (!Types.ObjectId.isValid(employeeId) || !await repository.findEmployeeById(employeeId)) fail('Colaborador não encontrado.', 404);
  const code = crypto.randomBytes(4).toString('hex').toUpperCase();
  await repository.saveEnrollmentCode({ employeeId, code, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) });
  return { code, expiresInHours: 24 };
}
async function revokeDevice(id) {
  if (!Types.ObjectId.isValid(id) || !await repository.revokeDevice(id)) fail('Dispositivo não encontrado.', 404);
  return { revoked: true };
}
async function saveCategory(input = {}) {
  const domain = typeof input.domain === 'string' ? input.domain.trim().toLowerCase() : '';
  const category = typeof input.category === 'string' ? input.category.trim() : '';
  const productivity = ['productive', 'neutral', 'unproductive'].includes(input.productivity) ? input.productivity : 'neutral';
  if (!domain || !category) fail('Domínio e categoria são obrigatórios.');
  if (domain.length > 253) fail('Domínio inválido.');
  const saved = await repository.upsertCategory({ domain, category, productivity });
  await require('../categorizer').reload();
  return saved;
}
async function report({ id, from: fromInput, to: toInput }) {
  if (!Types.ObjectId.isValid(id)) fail('Colaborador não encontrado.', 404);
  const to = toInput ? new Date(toInput) : new Date();
  const from = fromInput ? new Date(fromInput) : new Date(to.getTime() - 7 * 86400000);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) fail('Intervalo de datas inválido.');
  return { from, to, ...await repository.employeeReport({ employeeId: id, from, to }) };
}
module.exports = { listEmployees: () => repository.listEmployeesWithDevices(), createEmployee, generateEnrollmentCode, revokeDevice, saveCategory, report };
