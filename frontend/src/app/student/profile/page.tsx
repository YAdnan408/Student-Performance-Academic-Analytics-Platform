'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import StudentProfile from '@/components/student/StudentProfile';

const StudentProfilePage = () => {
  return (
    <DashboardLayout allowedRoles={['student']}>
      <StudentProfile />
    </DashboardLayout>
  );
};

export default StudentProfilePage;
