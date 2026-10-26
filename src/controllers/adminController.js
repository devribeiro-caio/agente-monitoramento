const service = require('../services/adminService');
const asyncHandler = handler => (req, res, next) => Promise.resolve(handler(req, res)).catch(next);
module.exports = {
  listEmployees: asyncHandler(async (_req, res) => res.json(await service.listEmployees())),
  createEmployee: asyncHandler(async (req, res) => res.status(201).json(await service.createEmployee(req.body))),
  generateEnrollmentCode: asyncHandler(async (req, res) => res.json(await service.generateEnrollmentCode(req.params.id))),
  revokeDevice: asyncHandler(async (req, res) => res.json(await service.revokeDevice(req.params.id))),
  saveCategory: asyncHandler(async (req, res) => res.json(await service.saveCategory(req.body))),
  employeeReport: asyncHandler(async (req, res) => res.json(await service.report({ id: req.params.id, from: req.query.from, to: req.query.to }))),
};
