'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import { adminService } from '@/services/adminService';
import { AdminCourse, AdminInstructor, AdminUser, CourseCreateData } from '@/types/admin';

type Tab = 'courses' | 'users';

const AdminDashboardPage = () => {
  const { user, loading: authLoading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('courses');

  if (authLoading || !user) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Spinner size="lg" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="max-w-7xl mx-auto p-4 lg:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Admin Panel</h1>
            <p className="text-purple-200/60 mt-1">Manage courses, instructors, and users</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-purple-200/50">{user.email}</span>
            <button onClick={logout} className="px-4 py-2 bg-white/10 rounded-xl hover:bg-white/20 text-sm transition-all">
              Logout
            </button>
          </div>
        </div>

        <div className="flex gap-1 mb-8 p-1 bg-white/5 rounded-2xl border border-white/10 w-fit">
          {([
            { id: 'courses' as Tab, label: 'Courses' },
            { id: 'users' as Tab, label: 'Users' },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-purple-500/30 text-purple-200 shadow-lg shadow-purple-500/10'
                  : 'text-purple-200/50 hover:text-purple-200 hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'courses' && <CoursesTab />}
        {activeTab === 'users' && <UsersTab />}
      </div>
    </div>
  );
};

const CoursesTab = () => {
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [instructors, setInstructors] = useState<AdminInstructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<AdminCourse | null>(null);
  const [assignInstructorId, setAssignInstructorId] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [coursesData, instructorsData] = await Promise.all([
        adminService.listCourses(),
        adminService.listInstructors(),
      ]);
      setCourses(coursesData);
      setInstructors(instructorsData);
    } catch (err) {
      console.error('Failed to load data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return;
    try {
      await adminService.deleteCourse(courseId);
      loadData();
    } catch (err) {
      console.error('Failed to delete course', err);
    }
  };

  const handleAssign = async () => {
    if (!selectedCourse || !assignInstructorId) return;
    try {
      await adminService.assignInstructor(selectedCourse.id, assignInstructorId);
      setShowAssignModal(false);
      setSelectedCourse(null);
      setAssignInstructorId('');
      loadData();
    } catch (err) {
      console.error('Failed to assign instructor', err);
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">All Courses ({courses.length})</h2>
        <Button onClick={() => setShowAddModal(true)}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Course
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : courses.length === 0 ? (
        <Card>
          <p className="text-purple-200/40 text-center py-8">No courses found. Add your first course.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {courses.map((course) => (
            <Card key={course.id}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-semibold text-white">{course.title}</h3>
                    <span className="text-xs bg-white/10 text-purple-200/70 px-2 py-0.5 rounded-full font-mono">
                      {course.course_code}
                    </span>
                  </div>
                  <p className="text-sm text-purple-200/60 line-clamp-1 mb-2">{course.description}</p>
                  <div className="flex items-center gap-4 text-xs text-purple-200/50">
                    <span>Cost: ৳{course.cost?.toLocaleString() || '—'}</span>
                    <span>Duration: {course.duration || '—'}</span>
                    <span>Instructor: {course.instructor_name || 'Not assigned'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedCourse(course);
                      setAssignInstructorId('');
                      setShowAssignModal(true);
                    }}
                  >
                    Assign
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(course.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AddCourseModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={loadData}
      />

      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title={`Assign Instructor${selectedCourse ? ` - ${selectedCourse.title}` : ''}`}
      >
        <div className="space-y-4">
          <label className="block text-sm font-medium text-purple-200">Select Instructor</label>
          <select
            value={assignInstructorId}
            onChange={(e) => setAssignInstructorId(e.target.value)}
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          >
            <option value="" className="bg-slate-900">Choose an instructor...</option>
            {instructors.map((inst) => (
              <option key={inst.id} value={inst.id} className="bg-slate-900">
                {inst.first_name} {inst.last_name} ({inst.employee_id})
              </option>
            ))}
          </select>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowAssignModal(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleAssign} disabled={!assignInstructorId}>Assign</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const AddCourseModal = ({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const [form, setForm] = useState<CourseCreateData>({
    course_code: '',
    title: '',
    description: '',
    credit_hours: 3,
    cost: 0,
    duration: '16 weeks',
    start_date: '',
    end_date: '',
    marks_distribution: { mid: 25, final: 40, quiz: 10, assignments: 10, lab: 10, attendance: 5 },
  });
  const [instructors, setInstructors] = useState<AdminInstructor[]>([]);
  const [selectedInstructorId, setSelectedInstructorId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      adminService.listInstructors().then(setInstructors).catch(() => {});
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!form.course_code || !form.title) return;
    setSubmitting(true);
    try {
      const result = await adminService.createCourse(form);
      if (selectedInstructorId) {
        await adminService.assignInstructor(result.id, selectedInstructorId);
      }
      onSuccess();
      onClose();
      setForm({
        course_code: '',
        title: '',
        description: '',
        credit_hours: 3,
        cost: 0,
        duration: '16 weeks',
        start_date: '',
        end_date: '',
        marks_distribution: { mid: 25, final: 40, quiz: 10, assignments: 10, lab: 10, attendance: 5 },
      });
      setSelectedInstructorId('');
    } catch (err) {
      console.error('Failed to create course', err);
    } finally {
      setSubmitting(false);
    }
  };

  const updateMarks = (field: string, value: number) => {
    setForm((prev) => ({
      ...prev,
      marks_distribution: { ...prev.marks_distribution, [field]: value },
    }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Course">
      <div className="space-y-4">
        <Input
          label="Course Code"
          placeholder="e.g. CSE101"
          value={form.course_code}
          onChange={(e) => setForm({ ...form, course_code: e.target.value })}
        />
        <Input
          label="Course Title"
          placeholder="e.g. Introduction to Computer Science"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <div>
          <label className="block text-sm font-medium text-purple-200 mb-1.5">Description</label>
          <textarea
            placeholder="Course description..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-purple-200/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Credit Hours"
            type="number"
            value={String(form.credit_hours)}
            onChange={(e) => setForm({ ...form, credit_hours: parseInt(e.target.value) || 0 })}
          />
          <Input
            label="Cost (৳)"
            type="number"
            value={String(form.cost)}
            onChange={(e) => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <Input
          label="Duration"
          value={form.duration}
          onChange={(e) => setForm({ ...form, duration: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Start Date"
            type="date"
            value={form.start_date}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
          />
          <Input
            label="End Date"
            type="date"
            value={form.end_date}
            onChange={(e) => setForm({ ...form, end_date: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-purple-200 mb-1.5">Assign Instructor (optional)</label>
          <select
            value={selectedInstructorId}
            onChange={(e) => setSelectedInstructorId(e.target.value)}
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          >
            <option value="" className="bg-slate-900">No instructor (assign later)</option>
            {instructors.map((inst) => (
              <option key={inst.id} value={inst.id} className="bg-slate-900">
                {inst.first_name} {inst.last_name} ({inst.employee_id})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-purple-200 mb-2">Marks Distribution (%)</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'mid', label: 'Mid' },
              { key: 'final', label: 'Final' },
              { key: 'quiz', label: 'Quiz' },
              { key: 'assignments', label: 'Assignments' },
              { key: 'lab', label: 'Lab' },
              { key: 'attendance', label: 'Attendance' },
            ].map((field) => (
              <Input
                key={field.key}
                label={field.label}
                type="number"
                value={String(form.marks_distribution[field.key as keyof typeof form.marks_distribution] || 0)}
                onChange={(e) => updateMarks(field.key, parseInt(e.target.value) || 0)}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={handleSubmit} loading={submitting} disabled={!form.course_code || !form.title}>
            {submitting ? 'Creating...' : 'Create Course'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

const UsersTab = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await adminService.listUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveUser = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to deactivate user: ${email}?`)) return;
    try {
      await adminService.deleteUser(userId);
      loadUsers();
    } catch (err) {
      console.error('Failed to remove user', err);
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">All Users ({users.length})</h2>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : users.length === 0 ? (
        <Card>
          <p className="text-purple-200/40 text-center py-8">No users found.</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {users.map((u) => (
            <Card key={u.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                    u.role === 'admin' ? 'bg-gradient-to-br from-amber-500 to-orange-600' :
                    u.role === 'instructor' ? 'bg-gradient-to-br from-purple-500 to-blue-600' :
                    'bg-gradient-to-br from-emerald-500 to-teal-600'
                  }`}>
                    {u.profile?.name
                      ? u.profile.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                      : u.email[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white">{u.profile?.name || u.email}</p>
                      <Badge variant={u.role === 'admin' ? 'warning' : u.role === 'instructor' ? 'info' : 'success'}>
                        {u.role}
                      </Badge>
                      {!u.is_active && <Badge variant="danger">Inactive</Badge>}
                    </div>
                    <p className="text-xs text-purple-200/50">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-purple-200/40">
                    Joined {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                  </span>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleRemoveUser(u.id, u.email)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminDashboardPage;
