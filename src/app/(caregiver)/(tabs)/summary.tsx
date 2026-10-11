import { ComingSoon } from '@/components/coming-soon';

export default function CaregiverSummary() {
  return <ComingSoon title="Panel del cuidador" showBack={false} icon="care" links={[{ label: 'Ver reporte', href: '/reports' }]} />;
}
