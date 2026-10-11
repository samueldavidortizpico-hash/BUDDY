import { ComingSoon } from '@/components/coming-soon';

export default function Medications() {
  return (
    <ComingSoon
      title="Mis medicamentos"
      showBack={false}
      icon="meds"
      links={[
        { label: 'Agregar medicamento', href: '/modals/add-medication' },
        { label: 'Detalle', href: '/medication/demo-med-amlodipino' },
        { label: 'Seguridad de medicamentos', href: '/safety' },
      ]}
    />
  );
}
