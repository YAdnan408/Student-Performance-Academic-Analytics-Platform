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
import { AdminCourse, AdminInstructor, AdminUser, CourseCreateData, CourseUpdateData } from '@/types/admin';
import {
  bdDatetimeLocalToIso,
  defaultEnrollmentClosesLocal,
  formatBdDateTime,
  isoToBdDatetimeLocal,
} from '@/lib/datetime';

type Tab = 'courses' | 'users';

const DAYS_OPTIONS = [
  'Sunday-Tuesday',
  'Monday-Wednesday',
  'Thursday-Saturday',
];

const TIME_SLOTS = [
  '8:00-9:20am',
  '9:30am-10:50am',
  '11:00am-12:20pm',
  '12:30-1:50pm',
  '2:00-3:20pm',
  '3:30-4:50pm',
];

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
  const [showEditModal, setShowEditModal] = useState(false);
  const [showArchivedModal, setShowArchivedModal] = useState(false);
  const [archivedCourses, setArchivedCourses] = useState<AdminCourse[]>([]);
  const [editingCourse, setEditingCourse] = useState<AdminCourse | null>(null);

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
    if (!confirm('Are you sure you want to remove this course?')) return;
    try {
      await adminService.deleteCourse(courseId);
      loadData();
    } catch (err) {
      console.error('Failed to delete course', err);
    }
  };

  const handleRenew = async (courseId: string) => {
    try {
      await adminService.renewCourse(courseId);
      loadData();
      setArchivedCourses(prev => prev.filter(c => c.id !== courseId));
    } catch (err) {
      console.error('Failed to renew course', err);
    }
  };

  const openArchivedModal = async () => {
    try {
      const data = await adminService.listArchivedCourses();
      setArchivedCourses(data);
      setShowArchivedModal(true);
    } catch (err) {
      console.error('Failed to load archived courses', err);
    }
  };

  const archivedCount = courses.filter(c => c.status === 'archived').length;

  return (
    <div className="animate-fadeIn">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">All Courses ({courses.length})</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openArchivedModal}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            Archived ({archivedCount})
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Course
          </Button>
        </div>
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
                    <Badge variant={course.status === 'archived' ? 'danger' : 'success'}>
                      {course.status === 'archived' ? 'Archived' : 'Active'}
                    </Badge>
                    {course.status === 'active' && course.enrollment_status && (
                      <Badge
                        variant={
                          course.enrollment_status === 'open'
                            ? 'success'
                            : course.enrollment_status === 'upcoming'
                              ? 'warning'
                              : 'danger'
                        }
                      >
                        {course.enrollment_status === 'open'
                          ? 'Enrollment open'
                          : course.enrollment_status === 'upcoming'
                            ? 'Enrollment upcoming'
                            : 'Enrollment closed'}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-purple-200/60 line-clamp-1 mb-2">{course.description}</p>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-purple-200/50">
                    <span>Cost: ৳{course.cost?.toLocaleString() || '—'}</span>
                    <span>Duration: {course.duration || '—'}</span>
                    <span>Instructor: {course.instructor_name || 'Not assigned'}</span>
                    {course.enrollment_closes_at && (
                      <span>Closes: {formatBdDateTime(course.enrollment_closes_at)}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {course.status === 'archived' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleRenew(course.id)}
                    >
                      Renew
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingCourse(course);
                      setShowEditModal(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(course.id)}
                  >
                    Remove
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

      <EditCourseModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingCourse(null);
        }}
        onSuccess={loadData}
        course={editingCourse}
        instructors={instructors}
      />

      <Modal
        isOpen={showArchivedModal}
        onClose={() => setShowArchivedModal(false)}
        title="Archived Courses"
      >
        <div className="space-y-3">
          {archivedCourses.length === 0 ? (
            <p className="text-purple-200/40 text-center py-4">No archived courses.</p>
          ) : (
            archivedCourses.map((course) => (
              <div key={course.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-white">{course.title}</p>
                  <p className="text-xs text-purple-200/50">{course.course_code}</p>
                </div>
                <Button size="sm" onClick={() => handleRenew(course.id)}>
                  Renew
                </Button>
              </div>
            ))
          )}
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
    cost: 0,
    duration: '16 weeks',
    start_date: '',
    end_date: '',
    enrollment_opens_at: '',
    enrollment_closes_at: '',
    marks_distribution: { mid: 25, final: 40, quiz: 10, assignments: 10, lab: 10, attendance: 5 },
    class_schedule: { days: '', time_slot: '' },
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
      const payload: CourseCreateData = {
        ...form,
        enrollment_opens_at: bdDatetimeLocalToIso(form.enrollment_opens_at || '') || undefined,
        enrollment_closes_at: bdDatetimeLocalToIso(form.enrollment_closes_at || '') || undefined,
      };
      if (!payload.class_schedule?.days && !payload.class_schedule?.time_slot) {
        delete payload.class_schedule;
      }
      if (!payload.enrollment_opens_at) delete payload.enrollment_opens_at;
      if (!payload.enrollment_closes_at) delete payload.enrollment_closes_at;
      const result = await adminService.createCourse(payload);
      if (selectedInstructorId) {
        await adminService.assignInstructor(result.id, selectedInstructorId);
      }
      onSuccess();
      onClose();
      setForm({
        course_code: '',
        title: '',
        description: '',
        cost: 0,
        duration: '16 weeks',
        start_date: '',
        end_date: '',
        enrollment_opens_at: '',
        enrollment_closes_at: '',
        marks_distribution: { mid: 25, final: 40, quiz: 10, assignments: 10, lab: 10, attendance: 5 },
        class_schedule: { days: '', time_slot: '' },
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

  const handleStartDateChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      start_date: value,
      enrollment_closes_at:
        prev.enrollment_closes_at || !value
          ? prev.enrollment_closes_at
          : defaultEnrollmentClosesLocal(value),
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
            label="Cost (৳)"
            type="number"
            value={String(form.cost)}
            onChange={(e) => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })}
          />
          <Input
            label="Duration"
            value={form.duration}
            onChange={(e) => setForm({ ...form, duration: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Start Date"
            type="date"
            value={form.start_date}
            onChange={(e) => handleStartDateChange(e.target.value)}
          />
          <Input
            label="End Date"
            type="date"
            value={form.end_date}
            onChange={(e) => setForm({ ...form, end_date: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-purple-200 mb-1.5">Enrollment Window (Bangladesh time)</label>
          <p className="text-xs text-purple-200/40 mb-2">
            Defaults to closing 24 hours before start. Leave open empty to allow enrollment immediately.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Opens at"
              type="datetime-local"
              value={form.enrollment_opens_at || ''}
              onChange={(e) => setForm({ ...form, enrollment_opens_at: e.target.value })}
            />
            <Input
              label="Closes at"
              type="datetime-local"
              value={form.enrollment_closes_at || ''}
              onChange={(e) => setForm({ ...form, enrollment_closes_at: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-purple-200 mb-1.5">Class Schedule</label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-purple-200/50 mb-1">Days</label>
              <select
                value={form.class_schedule?.days || ''}
                onChange={(e) => setForm({ ...form, class_schedule: { ...form.class_schedule!, days: e.target.value, time_slot: form.class_schedule?.time_slot || '' } })}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              >
                <option value="" className="bg-slate-900">Select days</option>
                {DAYS_OPTIONS.map((days) => (
                  <option key={days} value={days} className="bg-slate-900">{days}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-purple-200/50 mb-1">Time Slot</label>
              <select
                value={form.class_schedule?.time_slot || ''}
                onChange={(e) => setForm({ ...form, class_schedule: { ...form.class_schedule!, days: form.class_schedule?.days || '', time_slot: e.target.value } })}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              >
                <option value="" className="bg-slate-900">Select time</option>
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot} className="bg-slate-900">{slot}</option>
                ))}
              </select>
            </div>
          </div>
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

const EditCourseModal = ({
  isOpen,
  onClose,
  onSuccess,
  course,
  instructors,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  course: AdminCourse | null;
  instructors: AdminInstructor[];
}) => {
  const [form, setForm] = useState<CourseUpdateData>({
    course_code: '',
    title: '',
    description: '',
    cost: 0,
    duration: '16 weeks',
    start_date: '',
    end_date: '',
    enrollment_opens_at: '',
    enrollment_closes_at: '',
    marks_distribution: { mid: 25, final: 40, quiz: 10, assignments: 10, lab: 10, attendance: 5 },
    class_schedule: { days: '', time_slot: '' },
    instructor_id: null,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && course) {
      setForm({
        course_code: course.course_code || '',
        title: course.title || '',
        description: course.description || '',
        cost: course.cost || 0,
        duration: course.duration || '16 weeks',
        start_date: course.start_date || '',
        end_date: course.end_date || '',
        enrollment_opens_at: isoToBdDatetimeLocal(course.enrollment_opens_at),
        enrollment_closes_at: isoToBdDatetimeLocal(course.enrollment_closes_at),
        marks_distribution: course.marks_distribution as CourseUpdateData['marks_distribution'] || { mid: 25, final: 40, quiz: 10, assignments: 10, lab: 10, attendance: 5 },
        class_schedule: course.class_schedule as CourseUpdateData['class_schedule'] || { days: '', time_slot: '' },
        instructor_id: course.instructor_id || null,
      });
    }
  }, [isOpen, course]);

  const handleSubmit = async () => {
    if (!form.course_code || !form.title) return;
    setSubmitting(true);
    try {
      const payload: CourseUpdateData = {
        ...form,
        enrollment_opens_at: bdDatetimeLocalToIso(form.enrollment_opens_at || '') || '',
        enrollment_closes_at: bdDatetimeLocalToIso(form.enrollment_closes_at || '') || '',
      };
      if (!payload.class_schedule?.days && !payload.class_schedule?.time_slot) {
        delete payload.class_schedule;
      }
      await adminService.updateCourse(course!.id, payload);
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to update course', err);
    } finally {
      setSubmitting(false);
    }
  };

  const updateMarks = (field: string, value: number) => {
    setForm((prev) => ({
      ...prev,
      marks_distribution: { ...prev.marks_distribution, [field]: value } as CourseUpdateData['marks_distribution'],
    }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Course${course ? ` - ${course.title}` : ''}`}>
      <div className="space-y-4">
        <Input
          label="Course Code"
          placeholder="e.g. CSE101"
          value={form.course_code || ''}
          onChange={(e) => setForm({ ...form, course_code: e.target.value })}
        />
        <Input
          label="Course Title"
          placeholder="e.g. Introduction to Computer Science"
          value={form.title || ''}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <div>
          <label className="block text-sm font-medium text-purple-200 mb-1.5">Description</label>
          <textarea
            placeholder="Course description..."
            value={form.description || ''}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-purple-200/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Cost (৳)"
            type="number"
            value={String(form.cost || 0)}
            onChange={(e) => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })}
          />
          <Input
            label="Duration"
            value={form.duration || ''}
            onChange={(e) => setForm({ ...form, duration: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Start Date"
            type="date"
            value={form.start_date || ''}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
          />
          <Input
            label="End Date"
            type="date"
            value={form.end_date || ''}
            onChange={(e) => setForm({ ...form, end_date: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-purple-200 mb-1.5">Enrollment Window (Bangladesh time)</label>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Opens at"
              type="datetime-local"
              value={form.enrollment_opens_at || ''}
              onChange={(e) => setForm({ ...form, enrollment_opens_at: e.target.value })}
            />
            <Input
              label="Closes at"
              type="datetime-local"
              value={form.enrollment_closes_at || ''}
              onChange={(e) => setForm({ ...form, enrollment_closes_at: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-purple-200 mb-1.5">Class Schedule</label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-purple-200/50 mb-1">Days</label>
              <select
                value={form.class_schedule?.days || ''}
                onChange={(e) => setForm({ ...form, class_schedule: { days: e.target.value, time_slot: form.class_schedule?.time_slot || '' } })}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              >
                <option value="" className="bg-slate-900">Select days</option>
                {DAYS_OPTIONS.map((days) => (
                  <option key={days} value={days} className="bg-slate-900">{days}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-purple-200/50 mb-1">Time Slot</label>
              <select
                value={form.class_schedule?.time_slot || ''}
                onChange={(e) => setForm({ ...form, class_schedule: { days: form.class_schedule?.days || '', time_slot: e.target.value } })}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              >
                <option value="" className="bg-slate-900">Select time</option>
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot} className="bg-slate-900">{slot}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-purple-200 mb-1.5">Assign Instructor</label>
          <select
            value={form.instructor_id || ''}
            onChange={(e) => setForm({ ...form, instructor_id: e.target.value || null })}
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          >
            <option value="" className="bg-slate-900">No instructor</option>
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
                value={String((form.marks_distribution as Record<string, number>)?.[field.key] || 0)}
                onChange={(e) => updateMarks(field.key, parseInt(e.target.value) || 0)}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={handleSubmit} loading={submitting} disabled={!form.course_code || !form.title}>
            {submitting ? 'Updating...' : 'Update Course'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

const UsersTab = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [removeModalUser, setRemoveModalUser] = useState<AdminUser | null>(null);
  const [removing, setRemoving] = useState(false);

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

  const handleRemoveUser = (user: AdminUser) => {
    setRemoveModalUser(user);
  };

  const confirmRemoveUser = async () => {
    if (!removeModalUser) return;
    try {
      setRemoving(true);
      await adminService.deleteUser(removeModalUser.id);
      setRemoveModalUser(null);
      loadUsers();
    } catch (err) {
      console.error('Failed to remove user', err);
    } finally {
      setRemoving(false);
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
                    onClick={() => handleRemoveUser(u)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={!!removeModalUser} onClose={() => setRemoveModalUser(null)} title="Confirm Delete">
        {removeModalUser && (
          <div>
            <p className="text-purple-200/70 mb-6">
              Are you sure you want to permanently delete{' '}
              <span className="text-white font-semibold">{removeModalUser.profile?.name || removeModalUser.email}</span>?
              This action cannot be undone. All associated data (enrollments, grades, attendance, etc.) will also be removed.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setRemoveModalUser(null)} disabled={removing}>
                Cancel
              </Button>
              <Button variant="danger" onClick={confirmRemoveUser} loading={removing}>
                Confirm Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminDashboardPage;
