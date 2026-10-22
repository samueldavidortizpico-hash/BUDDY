import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { AdminPasswordForm } from '@/features/elder/admin-password-form';

/** Legacy locked handoffs remain navigable; new access always verifies the account password. */
export default function Unlock() {
  return <ScreenContainer keyboard header={<ScreenHeader title="Entrar como administrador" fallback="/elder" />}>
    <AdminPasswordForm />
  </ScreenContainer>;
}
