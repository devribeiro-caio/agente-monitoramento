const crypto = require('crypto');
const { Types } = require('mongoose');
const Employee = require('../models/Employee');
const Device = require('../models/Device');
const EnrollCode = require('../models/EnrollCode');
const DomainCategory = require('../models/DomainCategory');
const Event = require('../models/Event');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');

async function listEmployeesWithDevices() {
  const [employees, devices] = await Promise.all([
    Employee.find().sort({ name: 1 }).lean(),
    Device.find({ revoked: false }).select('-tokenHash').lean(),
  ]);
  return employees.map(employee => ({ ...employee, devices: devices.filter(device => String(device.employeeId) === String(employee._id)) }));
}
const createEmployee = data => Employee.create(data);
const findEmployeeById = id => Employee.findById(id).lean();
const saveEnrollmentCode = ({ employeeId, code, expiresAt }) => EnrollCode.create({ employeeId, codeHash: sha256(code), expiresAt });
const revokeDevice = id => Device.findByIdAndUpdate(id, { revoked: true }, { new: true }).select('-tokenHash').lean();
const upsertCategory = ({ domain, category, productivity }) => DomainCategory.findOneAndUpdate({ domain }, { category, productivity }, { upsert: true, new: true, runValidators: true }).lean();

async function employeeReport({ employeeId, from, to }) {
  const [report] = await Event.aggregate([
    { $match: { 'meta.employeeId': new Types.ObjectId(employeeId), timestamp: { $gte: from, $lt: to } } },
    { $facet: {
      byCategory: [{ $match: { kind: 'web' } }, { $group: { _id: '$category', totalSec: { $sum: '$durationSec' } } }, { $sort: { totalSec: -1 } }],
      byProductivity: [{ $match: { kind: 'web' } }, { $group: { _id: '$productivity', totalSec: { $sum: '$durationSec' } } }],
      topDomains: [{ $match: { kind: 'web' } }, { $group: { _id: '$domain', totalSec: { $sum: '$durationSec' }, visits: { $sum: 1 } } }, { $sort: { totalSec: -1 } }, { $limit: 10 }],
      topApps: [{ $match: { kind: 'app' } }, { $group: { _id: '$app', totalSec: { $sum: '$durationSec' } } }, { $sort: { totalSec: -1 } }, { $limit: 10 }],
      perDay: [{ $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp', timezone: 'America/Sao_Paulo' } }, activeSec: { $sum: '$durationSec' } } }, { $sort: { _id: 1 } }],
    } },
  ]);
  return report || { byCategory: [], byProductivity: [], topDomains: [], topApps: [], perDay: [] };
}
module.exports = { listEmployeesWithDevices, createEmployee, findEmployeeById, saveEnrollmentCode, revokeDevice, upsertCategory, employeeReport };
