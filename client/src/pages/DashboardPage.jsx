import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import useDebounce from '../hooks/useDebounce.js';
import { parseApiError } from '../services/api.js';
import * as studentService from '../services/studentService.js';
import StatCard from '../components/StatCard.jsx';
import StudentTable from '../components/StudentTable.jsx';
import StudentForm from '../components/StudentForm.jsx';
import Pagination from '../components/Pagination.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Spinner from '../components/Spinner.jsx';

const PAGE_SIZE = 10;

export default function DashboardPage() {
  const { admin } = useAuth();
  const toast = useToast();

  // list state
  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounce(searchInput.trim(), 400);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');

  // stats state
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // modal state
  const [formMode, setFormMode] = useState(null); // null | 'add' | 'edit'
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [formMessage, setFormMessage] = useState('');
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setListError('');
    try {
      const data = await studentService.fetchStudents({ page, limit: PAGE_SIZE, search });
      // If the current page no longer exists (e.g. last item deleted), step back one page.
      if (data.students.length === 0 && page > 1 && data.pagination.total > 0) {
        setPage(data.pagination.totalPages);
        return;
      }
      setStudents(data.students);
      setPagination(data.pagination);
    } catch (err) {
      setListError(parseApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  const loadStats = useCallback(async () => {
    try {
      setStats(await studentService.fetchStats());
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // New search -> back to the first page
  useEffect(() => {
    setPage(1);
  }, [search]);

  const closeForm = () => {
    if (saving) return;
    setFormMode(null);
    setEditing(null);
    setFormErrors({});
    setFormMessage('');
  };

  const openAdd = () => {
    setFormErrors({});
    setFormMessage('');
    setEditing(null);
    setFormMode('add');
  };

  const openEdit = (student) => {
    setFormErrors({});
    setFormMessage('');
    setEditing(student);
    setFormMode('edit');
  };

  const handleSave = async (payload) => {
    if (saving) return;
    setSaving(true);
    setFormErrors({});
    setFormMessage('');
    try {
      if (formMode === 'edit') {
        await studentService.updateStudent(editing._id, payload);
        toast.success('Student updated successfully.');
      } else {
        await studentService.createStudent(payload);
        toast.success('Student added successfully.');
      }
      setFormMode(null);
      setEditing(null);
      await Promise.all([loadStudents(), loadStats()]);
    } catch (err) {
      const parsed = parseApiError(err);
      setFormErrors(parsed.errors || {});
      setFormMessage(parsed.message);
      if (parsed.status === 404) {
        toast.error('This student no longer exists. The list has been refreshed.');
        setFormMode(null);
        setEditing(null);
        loadStudents();
        loadStats();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete || deleting) return;
    setDeleting(true);
    try {
      await studentService.deleteStudent(toDelete._id);
      toast.success(`Deleted ${toDelete.name}.`);
      setToDelete(null);
      await Promise.all([loadStudents(), loadStats()]);
    } catch (err) {
      const parsed = parseApiError(err);
      toast.error(parsed.status === 404 ? 'This student was already deleted. Refreshing the list.' : parsed.message);
      if (parsed.status === 404) {
        setToDelete(null);
        loadStudents();
        loadStats();
      }
    } finally {
      setDeleting(false);
    }
  };

  const hasSearch = search.length > 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">Welcome back, {admin?.name}. Manage your student records here.</p>
        </div>
        <button type="button" className="btn-primary" onClick={openAdd}>
          + Add Student
        </button>
      </div>

      <section aria-label="Summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total students" value={stats?.total ?? '—'} loading={statsLoading} />
        <StatCard label="Added in last 7 days" value={stats?.addedLast7Days ?? '—'} loading={statsLoading} />
        <StatCard label="Branches" value={stats?.totalBranches ?? '—'} loading={statsLoading} />
        <StatCard
          label="Largest branch"
          value={stats?.topBranch?.name ?? '—'}
          hint={stats?.topBranch ? `${stats.topBranch.count} student(s)` : 'No data yet'}
          loading={statsLoading}
        />
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" aria-label="Student records">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Student records</h2>
          <div className="w-full sm:max-w-xs">
            <label htmlFor="search" className="sr-only">Search students by name or roll number</label>
            <input
              id="search"
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name or roll number"
              maxLength={100}
              className="input"
            />
          </div>
        </div>

        {loading && students.length === 0 ? (
          <div className="flex justify-center p-12">
            <Spinner label="Loading students..." />
          </div>
        ) : listError ? (
          <div className="p-10 text-center" role="alert">
            <p className="font-medium text-red-700">{listError}</p>
            <button type="button" className="btn-secondary mt-4" onClick={loadStudents}>
              Try again
            </button>
          </div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-base font-medium text-slate-800">
              {hasSearch ? 'No students match your search' : 'No students yet'}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {hasSearch ? 'Try a different name or roll number.' : 'Add your first student to get started.'}
            </p>
            {!hasSearch && (
              <button type="button" className="btn-primary mt-4" onClick={openAdd}>
                + Add Student
              </button>
            )}
          </div>
        ) : (
          <div className={loading ? 'opacity-60 transition-opacity' : ''} aria-busy={loading}>
            <StudentTable students={students} onEdit={openEdit} onDelete={setToDelete} />
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={pagination.limit}
              onPageChange={(p) => setPage(Math.min(Math.max(p, 1), pagination.totalPages))}
            />
          </div>
        )}
      </section>

      {formMode && (
        <Modal title={formMode === 'edit' ? 'Edit student' : 'Add student'} onClose={closeForm} locked={saving}>
          {formMessage && Object.keys(formErrors).length === 0 && (
            <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {formMessage}
            </div>
          )}
          <StudentForm
            key={editing?._id || 'new'}
            initialValues={editing || undefined}
            submitLabel={formMode === 'edit' ? 'Update' : 'Save'}
            onSubmit={handleSave}
            onCancel={closeForm}
            serverErrors={formErrors}
            busy={saving}
          />
        </Modal>
      )}

      {toDelete && (
        <ConfirmDialog
          title="Delete student?"
          message={`Are you sure you want to delete ${toDelete.name} (Roll No. ${toDelete.rollNumber})? This action cannot be undone.`}
          busy={deleting}
          onConfirm={handleDelete}
          onCancel={() => !deleting && setToDelete(null)}
        />
      )}
    </div>
  );
}
