import { ComingSoon } from '@/components/coming-soon';

export default function Welcome() {
  return (
    <ComingSoon
      title="Bienvenida"
      showBack={false}
      links={[
        { label: 'Comenzar', href: '/onboarding' },
        { label: 'Iniciar sesión', href: '/profile-choice' },
      ]}
    />
  );
}
