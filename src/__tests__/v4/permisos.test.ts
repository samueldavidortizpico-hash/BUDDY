/** V4 (error 13): todo cambio de permiso del adulto mayor queda como novedad para el administrador. Datos [PRUEBA]. */
import { db } from '@/infrastructure/local/db';
import { elderAnswers } from '@/state/care';
import { locationActions } from '@/state/location';
import { handPhoneTo, seedRenderData, testUser } from '@/testing/render-fixtures';

const news = (elderId: string) => db.list('alerts', testUser.id, elderId).filter((a) => a.kind === 'permission_changed' && a.status === 'pending');

it('desactivar los avisos genera una novedad que explica la consecuencia', async () => {
  const elder = await seedRenderData();
  elderAnswers.permissionChanged(elder.id, 'notifications', false);
  expect(news(elder.id)).toHaveLength(1);
  expect(news(elder.id)[0].detail).toMatch(/^Rosa desactivó los avisos en su celular a las \d{1,2}:\d{2} [ap]\. m\.\. Sin avisos, BUDDY no puede recordarle a la hora\.$/);
});

it('aceptar y dejar de compartir la ubicación genera una novedad cada vez', async () => {
  const elder = await seedRenderData();
  handPhoneTo(elder.id);
  locationActions.decide(elder.id, true);
  locationActions.revoke(elder.id);
  expect(news(elder.id).map((a) => a.detail.split(' a las')[0])).toEqual(['Rosa activó compartir su ubicación en su celular', 'Rosa desactivó compartir su ubicación en su celular']);
});
