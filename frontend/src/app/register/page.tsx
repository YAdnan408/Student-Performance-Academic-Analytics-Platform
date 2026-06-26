'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/authService';
import { UserRole, Department, Program } from '@/types/auth';
import api from '@/lib/api';

const degreeLevelOptions = ['undergraduate', 'postgraduate'];
const instructorDegreeOptions = [
  { value: 'undergraduate', label: 'Undergraduate Only' },
  { value: 'postgraduate', label: 'Postgraduate Only' },
  { value: 'undergraduate,postgraduate', label: 'Both Undergraduate and Postgraduate' },
];
const semesterOptions = [
  'Spring 25', 'Summer 25', 'Fall 25',
  'Spring 26', 'Summer 26', 'Fall 26',
  'Spring 27', 'Summer 27', 'Fall 27',
];

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student' as UserRole,
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
    student_id: '',
    employee_id: '',
    department_code: '',
    degree_level: '',
    program_id: '',
    enrolled_semester: '',
    current_semester: '',
    designation: '',
  });
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1);
  const router = useRouter();

  useEffect(() => {
    if (formData.degree_level) {
      api.get<Department[]>('/departments', { params: { degree_level: formData.degree_level } })
        .then(res => setDepartments(res.data))
        .catch(() => setDepartments([]));
      setFormData(prev => ({ ...prev, department_code: '', program_id: '' }));
    } else {
      setDepartments([]);
      setPrograms([]);
    }
  }, [formData.degree_level]);

  useEffect(() => {
    if (formData.degree_level && formData.department_code) {
      const dept = departments.find(d => d.code === formData.department_code);
      if (dept) {
        api.get<Program[]>('/departments/programs', { params: { degree_level: formData.degree_level, department_id: dept.id } })
          .then(res => setPrograms(res.data))
          .catch(() => setPrograms([]));
      }
      setFormData(prev => ({ ...prev, program_id: '' }));
    } else {
      setPrograms([]);
    }
  }, [formData.degree_level, formData.department_code]);

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (formData.role === 'student' && !/^\d{8}$/.test(formData.student_id)) {
      setError('Student ID must be exactly 8 digits');
      return;
    }

    if (formData.role === 'instructor' && !/^\d{8}$/.test(formData.employee_id)) {
      setError('Employee ID must be exactly 8 digits');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        email: formData.email,
        password: formData.password,
        role: formData.role,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        department_code: formData.department_code || undefined,
        degree_level: formData.degree_level || undefined,
      };

      if (formData.role === 'student') {
        payload.student_id = formData.student_id;
        payload.program_id = formData.program_id || undefined;
        payload.enrolled_semester = formData.enrolled_semester || undefined;
        payload.current_semester = formData.current_semester || undefined;
      } else if (formData.role === 'instructor') {
        payload.employee_id = formData.employee_id;
        payload.designation = formData.designation || undefined;
      }

      await authService.register(payload);
      router.push('/login?registered=true');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to register. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStudent = formData.role === 'student';
  const isInstructor = formData.role === 'instructor';

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl animate-pulse delay-700" />
      </div>

      <div className="relative w-full max-w-2xl px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 shadow-lg shadow-purple-500/25 mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">Create Account</h1>
          <p className="text-purple-200/70 mt-1">Join the Student Performance & Academic Analytics platform</p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className={`w-3 h-3 rounded-full transition-all duration-300 ${step === 1 ? 'bg-purple-400 scale-125' : 'bg-white/20'}`} />
          <div className="w-12 h-0.5 bg-white/20" />
          <div className={`w-3 h-3 rounded-full transition-all duration-300 ${step === 2 ? 'bg-purple-400 scale-125' : 'bg-white/20'}`} />
          <div className="w-12 h-0.5 bg-white/20" />
          <div className={`w-3 h-3 rounded-full transition-all duration-300 ${step === 3 ? 'bg-purple-400 scale-125' : 'bg-white/20'}`} />
        </div>

        {/* Main card */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl shadow-2xl shadow-black/20 p-8">
          {error && (
            <div className="mb-6 flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl px-4 py-3 text-sm">
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Step 1: Account Info */}
            {step === 1 && (
              <div className="space-y-5 animate-fadeIn">
                <h2 className="text-lg font-semibold text-white">Account Information</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-1.5">First Name</label>
                    <input
                      type="text" required value={formData.first_name}
                      onChange={e => updateField('first_name', e.target.value)}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-purple-200/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-1.5">Last Name</label>
                    <input
                      type="text" required value={formData.last_name}
                      onChange={e => updateField('last_name', e.target.value)}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-purple-200/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-1.5">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-purple-300/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <input
                      type="email" required value={formData.email}
                      onChange={e => updateField('email', e.target.value)}
                      className="w-full pl-12 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-purple-200/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                      placeholder="john@university.edu"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-1.5">Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-purple-300/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'} required value={formData.password}
                        onChange={e => updateField('password', e.target.value)}
                        className="w-full pl-12 pr-12 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-purple-200/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                        placeholder="••••••••"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-purple-300/50 hover:text-purple-200 transition-colors">
                        {showPassword ? (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-1.5">Confirm Password</label>
                    <input
                      type="password" required value={formData.confirmPassword}
                      onChange={e => updateField('confirmPassword', e.target.value)}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-purple-200/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-1.5">I want to register as</label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['student', 'instructor', 'admin'] as UserRole[]).map(r => (
                      <button type="button" key={r}
                        onClick={() => updateField('role', r)}
                        className={`px-4 py-3 rounded-xl text-sm font-medium capitalize transition-all duration-200 border ${
                          formData.role === r
                            ? 'bg-purple-500/20 border-purple-500/50 text-purple-200 shadow-lg shadow-purple-500/10'
                            : 'bg-white/5 border-white/10 text-purple-200/60 hover:bg-white/10 hover:border-white/20'
                        }`}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Personal Details */}
            {step === 2 && (
              <div className="space-y-5 animate-fadeIn">
                <h2 className="text-lg font-semibold text-white">Personal Details</h2>

                {isStudent && (
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-1.5">Student ID (8 digits)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-purple-300/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                        </svg>
                      </div>
                      <input type="text" required maxLength={8} value={formData.student_id}
                        onChange={e => updateField('student_id', e.target.value.replace(/\D/g, '').slice(0, 8))}
                        className="w-full pl-12 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-purple-200/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                        placeholder="12345678" />
                    </div>
                  </div>
                )}

                {isInstructor && (
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-1.5">Employee ID (8 digits)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-purple-300/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                        </svg>
                      </div>
                      <input type="text" required maxLength={8} value={formData.employee_id}
                        onChange={e => updateField('employee_id', e.target.value.replace(/\D/g, '').slice(0, 8))}
                        className="w-full pl-12 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-purple-200/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                        placeholder="87654321" />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-1.5">
                    Degree Level {isInstructor ? '(select one or both)' : ''}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-purple-300/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                      </svg>
                    </div>
                    <select value={formData.degree_level}
                      onChange={e => updateField('degree_level', e.target.value)}
                      className="w-full pl-12 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all">
                      <option value="" className="bg-slate-800">Select Degree Level</option>
                      {(isInstructor ? instructorDegreeOptions : degreeLevelOptions.map(d => ({ value: d, label: d.charAt(0).toUpperCase() + d.slice(1) }))).map(opt => (
                        <option key={opt.value} value={opt.value} className="bg-slate-800">{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {formData.degree_level && (
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-1.5">Department</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-purple-300/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <select value={formData.department_code}
                        onChange={e => updateField('department_code', e.target.value)}
                        className="w-full pl-12 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all">
                        <option value="" className="bg-slate-800">Select Department</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.code} className="bg-slate-800">{d.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {isStudent && formData.department_code && formData.degree_level && (
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-1.5">Program</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-purple-300/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <select value={formData.program_id}
                        onChange={e => updateField('program_id', e.target.value)}
                        className="w-full pl-12 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all">
                        <option value="" className="bg-slate-800">Select Program</option>
                        {programs.map(p => (
                          <option key={p.id} value={p.id} className="bg-slate-800">{p.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-1.5">Phone Number</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-purple-300/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <input type="tel" value={formData.phone}
                        onChange={e => updateField('phone', e.target.value)}
                        className="w-full pl-12 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-purple-200/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                        placeholder="+1 (555) 123-4567" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-1.5">Address</label>
                    <textarea value={formData.address} rows={2}
                      onChange={e => updateField('address', e.target.value)}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-purple-200/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all resize-none"
                      placeholder="123 University Ave, City, State" />
                  </div>
                </div>

                {isInstructor && (
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-1.5">Designation</label>
                    <input type="text" value={formData.designation}
                      onChange={e => updateField('designation', e.target.value)}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-purple-200/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                      placeholder="Assistant Professor" />
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Semester Info (Student only) */}
            {step === 3 && (
              <div className="space-y-5 animate-fadeIn">
                {isStudent && (
                  <>
                    <h2 className="text-lg font-semibold text-white">Academic Information</h2>

                    <div>
                      <label className="block text-sm font-medium text-purple-200 mb-1.5">Admission / Enrolled Semester</label>
                      <select value={formData.enrolled_semester}
                        onChange={e => updateField('enrolled_semester', e.target.value)}
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all">
                        <option value="" className="bg-slate-800">Select enrolled semester</option>
                        {semesterOptions.map(s => (
                          <option key={s} value={s} className="bg-slate-800">{s}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-purple-200 mb-1.5">Current Semester</label>
                      <select value={formData.current_semester}
                        onChange={e => updateField('current_semester', e.target.value)}
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all">
                        <option value="" className="bg-slate-800">Select current semester</option>
                        {semesterOptions.map(s => (
                          <option key={s} value={s} className="bg-slate-800">{s}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {!isStudent && (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4">
                      <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-semibold text-white mb-1">Almost done!</h2>
                    <p className="text-purple-200/60">Review your information and submit.</p>
                  </div>
                )}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
              <div>
                {step > 1 ? (
                  <button type="button" onClick={() => setStep(step - 1)}
                    className="px-6 py-2.5 text-sm font-medium text-purple-200/70 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all duration-200">
                    ← Back
                  </button>
                ) : (
                  <div />
                )}
              </div>

              <div className="flex gap-3">
                {step < 3 ? (
                  <button type="button" onClick={() => setStep(step + 1)}
                    className="px-8 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-xl shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-200">
                    Continue →
                  </button>
                ) : (
                  <button type="submit" disabled={isSubmitting}
                    className="px-8 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-xl shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Creating Account...
                      </span>
                    ) : 'Create Account'}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Login link */}
        <p className="text-center mt-6 text-purple-200/50 text-sm">
          Already have an account?{' '}
          <a href="/login" className="text-purple-300 hover:text-purple-200 underline underline-offset-2 transition-colors">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
