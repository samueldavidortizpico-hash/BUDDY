import { ComingSoon } from '@/components/coming-soon';

export default function Health() {
  return <ComingSoon title="Registros de salud" icon="heart" links={[{ label: 'Agregar registro', href: '/modals/add-vital' }]} />;
}
