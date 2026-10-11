import { ComingSoon } from '@/components/coming-soon';

export default function Onboarding() {
  return <ComingSoon title="Conoce BUDDY" links={[{ label: 'Elegir mi perfil', href: '/profile-choice' }]} />;
}
