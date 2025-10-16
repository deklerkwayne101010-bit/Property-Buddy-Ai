import VideoGenerator from '@/components/VideoGenerator';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';

export default function VideoGeneratorPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <VideoGenerator />
      </DashboardLayout>
    </ProtectedRoute>
  );
}