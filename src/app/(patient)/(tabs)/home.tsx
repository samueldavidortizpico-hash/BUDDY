import { ComingSoon } from '@/components/coming-soon';

export default function Home() {
  return (
    <ComingSoon
      title="Inicio"
      showBack={false}
      icon="home"
      links={[
        { label: 'Recordatorio', href: '/modals/reminder' },
        { label: 'Estado de ánimo', href: '/mood' },
        { label: 'Salud', href: '/health' },
        { label: 'Sueño', href: '/sleep' },
        { label: 'Emergencia', href: '/modals/emergency' },
        { label: 'Perfil', href: '/settings' },
      ]}
    />
  );
}
