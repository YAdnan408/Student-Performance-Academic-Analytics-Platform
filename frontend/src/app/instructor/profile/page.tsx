'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import InstructorProfile from '@/components/instructor/InstructorProfile';

const InstructorProfilePage = () => {
  return (
    <DashboardLayout allowedRoles={['instructor']}>
      <InstructorProfile />
    </DashboardLayout>
  );
};

export default InstructorProfilePage;
