import api from './api.js';

export const fetchStudents = ({ page = 1, limit = 10, search = '' } = {}) =>
  api.get('/students', { params: { page, limit, search } }).then((r) => r.data.data);

export const fetchStats = () => api.get('/students/stats').then((r) => r.data.data);

export const fetchStudent = (id) => api.get(`/students/${id}`).then((r) => r.data.data.student);

export const createStudent = (payload) => api.post('/students', payload).then((r) => r.data);

export const updateStudent = (id, payload) => api.put(`/students/${id}`, payload).then((r) => r.data);

export const deleteStudent = (id) => api.delete(`/students/${id}`).then((r) => r.data);
