import { ComingSoon } from '@/components/coming-soon';

export default function CaregiverAccount() {
  return <ComingSoon title="Cuenta" showBack={false} icon="user" links={[{ label: 'Cambiar tipo de perfil', href: '/profile-choice' }]} />;
}
