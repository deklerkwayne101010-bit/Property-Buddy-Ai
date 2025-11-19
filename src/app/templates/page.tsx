'use client';

import DashboardLayout from '../../components/DashboardLayout';
import ProtectedRoute from '../../components/ProtectedRoute';

export default function TemplatesPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-7xl mx-auto space-y-6">
          <iframe
            src="https://renderform.io/share/live-preview/?i=slow-ponies-trot-fiercely-1105"
            width="100%"
            height="500px"
            frameBorder="0"
          />

          <iframe
            src="https://renderform.io/share/live-preview/?i=purple-frogs-howl-smoothly-1437"
            width="100%"
            height="500px"
            frameBorder="0"
          />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
