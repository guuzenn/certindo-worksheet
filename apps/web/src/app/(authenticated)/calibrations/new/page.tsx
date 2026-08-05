import { Suspense } from 'react';
import { CalibrationForm } from '@/components/calibration-form';

export default function NewCalibrationPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-400">Memuat formulir kalibrasi...</div>}>
      <CalibrationForm />
    </Suspense>
  );
}
