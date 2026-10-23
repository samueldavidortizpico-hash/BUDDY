import { elderAnswers } from '../care';
import { db } from '@/infrastructure/local/db';
import { seedRenderData, testUser } from '@/testing/render-fixtures';
import { automationActions } from '../automations';

describe('respuestas de automatizaciones', () => {
  it('guarda la respuesta exacta en Salud y una respuesta de malestar crea seguimiento', async () => {
    const elder = await seedRenderData();
    const item = automationActions.create('mood', '20:00')!;
    elderAnswers.automationResponse(item.id, 'Mal', elder.id);
    const checkin = db.list('checkins', testUser.id, elder.id)[0];
    expect(checkin).toMatchObject({ mood: 'bad', automationAnswers: { [item.id]: { answer: 'Mal' } } });
    expect(db.list('alerts', testUser.id, elder.id).some((a) => a.kind === 'checkin_unwell' && a.status === 'pending')).toBe(true);
  });
});
