import { ComingSoon } from '@/components/coming-soon';

export default function Wellness() {
  return <ComingSoon title="Bienestar diario" showBack={false} icon="heart" links={[{ label: 'Historial', href: '/reports' }]} />;
}
