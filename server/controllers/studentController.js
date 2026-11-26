const Student = require('../models/Student');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { escapeRegex, isValidObjectId, validateStudentPayload } = require('../utils/validators');

function assertValidId(id) {
  if (!isValidObjectId(id)) throw new AppError('Invalid student ID', 400);
}

// GET /api/students?search=&page=&limit=
exports.listStudents = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
  const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : '';

  const filter = {};
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: rx }, { rollNumber: rx }];
  }

  const [students, total] = await Promise.all([
    Student.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Student.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      students,
      pagination: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) },
    },
  });
});

// GET /api/students/stats
exports.getStats = asyncHandler(async (_req, res) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [total, addedThisMonth, addedLast7Days, branches] = await Promise.all([
    Student.countDocuments(),
    Student.countDocuments({ createdAt: { $gte: startOfMonth } }),
    Student.countDocuments({ createdAt: { $gte: weekAgo } }),
    Student.aggregate([
      { $group: { _id: '$branch', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ]),
  ]);

  res.json({
    success: true,
    data: {
      total,
      addedThisMonth,
      addedLast7Days,
      totalBranches: branches.length,
      topBranch: branches[0] ? { name: branches[0]._id, count: branches[0].count } : null,
    },
  });
});

// GET /api/students/:id
exports.getStudent = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  const student = await Student.findById(req.params.id);
  if (!student) throw new AppError('Student not found', 404);
  res.json({ success: true, data: { student } });
});

// POST /api/students
exports.createStudent = asyncHandler(async (req, res) => {
  const { errors, data } = validateStudentPayload(req.body);
  if (Object.keys(errors).length) throw new AppError('Please fix the highlighted fields', 400, errors);

  const student = await Student.create(data); // only whitelisted fields
  res.status(201).json({ success: true, message: 'Student added successfully', data: { student } });
});

// PUT /api/students/:id
exports.updateStudent = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  const { errors, data } = validateStudentPayload(req.body);
  if (Object.keys(errors).length) throw new AppError('Please fix the highlighted fields', 400, errors);

  const student = await Student.findByIdAndUpdate(req.params.id, data, {
    new: true,
    runValidators: true,
    context: 'query',
  });
  if (!student) throw new AppError('Student not found', 404);

  res.json({ success: true, message: 'Student updated successfully', data: { student } });
});

// DELETE /api/students/:id
exports.deleteStudent = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  const student = await Student.findByIdAndDelete(req.params.id);
  if (!student) throw new AppError('Student not found', 404);
  res.json({ success: true, message: 'Student deleted successfully', data: { id: student._id } });
});
