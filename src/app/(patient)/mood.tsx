import { ComingSoon } from '@/components/coming-soon';

export default function Mood() {
  return <ComingSoon title="Estado de ánimo" icon="heart" links={[{ label: 'Síntomas', href: '/symptoms' }]} />;
}
