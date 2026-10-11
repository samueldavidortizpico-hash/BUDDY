import { ComingSoon } from '@/components/coming-soon';

export default function ProfileChoice() {
  return (
    <ComingSoon
      title="¿Cómo usarás BUDDY?"
      links={[
        { label: 'Adulto mayor', href: '/home' },
        { label: 'Familiar o cuidador', href: '/summary' },
      ]}
    />
  );
}
