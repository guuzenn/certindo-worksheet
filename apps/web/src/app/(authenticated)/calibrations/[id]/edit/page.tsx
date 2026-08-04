import { CalibrationForm } from '@/components/calibration-form';

export default async function EditCalibrationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CalibrationForm recordId={id} />;
}
