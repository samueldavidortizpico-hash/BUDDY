import { ComingSoon } from '@/components/coming-soon';

export default function Settings() {
  return (
    <ComingSoon
      title="Perfil y configuración"
      icon="user"
      links={[
        { label: 'Accesibilidad', href: '/settings/accessibility' },
        { label: 'Cambiar tipo de perfil', href: '/profile-choice' },
      ]}
    />
  );
}
