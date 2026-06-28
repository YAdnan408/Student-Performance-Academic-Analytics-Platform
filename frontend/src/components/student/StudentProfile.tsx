'use client';

import React, { useState, useEffect, useRef } from 'react';
import { profileService } from '@/services/profileService';
import { StudentProfile as StudentProfileType, StudentProfileUpdate } from '@/types/profile';
import { Card, Avatar, Button, Input, Badge, Spinner } from '@/components/ui';

const StudentProfile = () => {
  const [profile, setProfile] = useState<StudentProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<StudentProfileUpdate>({});

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await profileService.getStudentProfile();
      setProfile(data);
      setForm({
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone || '',
        address: data.address || '',
        student_id: data.student_id,
      });
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.message || 'Failed to load profile';
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const updated = await profileService.updateStudentProfile(form);
      setProfile(updated);
      setEditMode(false);
      setSuccess('Profile updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    try {
      setUploading(true);
      setError('');
      const result = await profileService.uploadProfilePhoto(file);
      setProfile(prev => prev ? { ...prev, profile_photo: result.photo_url } : null);
      setSuccess('Photo uploaded successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const cancelEdit = () => {
    if (!profile) return;
    setForm({
      first_name: profile.first_name,
      last_name: profile.last_name,
      phone: profile.phone || '',
      address: profile.address || '',
      student_id: profile.student_id,
    });
    setEditMode(false);
    setError('');
  };

  if (loading) return <Spinner size="lg" className="py-20" />;

  if (!profile) return <p className="text-red-300">{error || 'Failed to load profile.'}</p>;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My Profile</h1>
          <p className="text-purple-200/60 text-sm mt-1">Manage your personal information</p>
        </div>
        {!editMode ? (
          <Button variant="primary" size="sm" icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          } onClick={() => setEditMode(true)}>
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={cancelEdit}>Cancel</Button>
            <Button variant="primary" size="sm" loading={saving} onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl px-4 py-3 text-sm">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl px-4 py-3 text-sm">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <div className="relative group">
              <Avatar
                src={profile.profile_photo}
                name={`${profile.first_name} ${profile.last_name}`}
                size="xl"
                className="mb-4 ring-4 ring-purple-500/20"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                {uploading ? (
                  <svg className="animate-spin w-6 h-6 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>
            <h2 className="text-lg font-semibold text-white">{profile.first_name} {profile.last_name}</h2>
            <p className="text-sm text-purple-200/60 mb-3">{profile.email}</p>
            <Badge variant="info">Student</Badge>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="text-lg font-semibold text-white mb-6">Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {editMode ? (
              <>
                <Input
                  label="First Name"
                  value={form.first_name || ''}
                  onChange={e => setForm({ ...form, first_name: e.target.value })}
                  icon={
                    <svg className="w-5 h-5 text-purple-300/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  }
                />
                <Input
                  label="Last Name"
                  value={form.last_name || ''}
                  onChange={e => setForm({ ...form, last_name: e.target.value })}
                />
                <Input
                  label="Student ID"
                  value={form.student_id || ''}
                  onChange={e => setForm({ ...form, student_id: e.target.value })}
                  icon={
                    <svg className="w-5 h-5 text-purple-300/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                    </svg>
                  }
                />
                <Input
                  label="Phone"
                  value={form.phone || ''}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  icon={
                    <svg className="w-5 h-5 text-purple-300/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  }
                />
                <div className="md:col-span-2">
                  <Input
                    label="Address"
                    value={form.address || ''}
                    onChange={e => setForm({ ...form, address: e.target.value })}
                    icon={
                      <svg className="w-5 h-5 text-purple-300/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    }
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs text-purple-200/40 mb-1">First Name</label>
                  <p className="text-white">{profile.first_name}</p>
                </div>
                <div>
                  <label className="block text-xs text-purple-200/40 mb-1">Last Name</label>
                  <p className="text-white">{profile.last_name}</p>
                </div>
                <div>
                  <label className="block text-xs text-purple-200/40 mb-1">Student ID</label>
                  <p className="text-white font-mono">{profile.student_id}</p>
                </div>
                <div>
                  <label className="block text-xs text-purple-200/40 mb-1">Phone</label>
                  <p className="text-white">{profile.phone || '—'}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs text-purple-200/40 mb-1">Address</label>
                  <p className="text-white">{profile.address || '—'}</p>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="text-lg font-semibold text-white mb-4">Account Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs text-purple-200/40 mb-1">Email</label>
            <p className="text-white">{profile.email}</p>
          </div>
          <div>
            <label className="block text-xs text-purple-200/40 mb-1">Member Since</label>
            <p className="text-white">{new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default StudentProfile;
