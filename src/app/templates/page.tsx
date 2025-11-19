'use client';

import DashboardLayout from '../../components/DashboardLayout';
import ProtectedRoute from '../../components/ProtectedRoute';

export default function TemplatesPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-7xl mx-auto">
          {/* Blank page - ready for new content */}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
