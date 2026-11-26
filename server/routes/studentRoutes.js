const express = require('express');
const {
  listStudents,
  getStats,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
} = require('../controllers/studentController');
const { requireAuth } = require('../middleware/auth');
const { verifyCsrf } = require('../middleware/csrf');

const router = express.Router();

// Every student route requires a valid admin session; unsafe methods also require a CSRF token.
router.use(requireAuth, verifyCsrf);

router.get('/', listStudents);
router.get('/stats', getStats); // must be declared before '/:id'
router.get('/:id', getStudent);
router.post('/', createStudent);
router.put('/:id', updateStudent);
router.delete('/:id', deleteStudent);

module.exports = router;
