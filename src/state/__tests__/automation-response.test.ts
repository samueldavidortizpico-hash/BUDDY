import { elderAnswers } from '../care';
import { strings } from '@/i18n';
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

describe('respuestas con el texto real de los botones del adulto mayor', () => {
  const E = strings.elder;
  const waterToday = (elderId: string) => db.list('water', testUser.id, elderId).length;

  it(`"${strings.elder.waterBtn}" anota un vaso y "${strings.elder.notYet}" no`, async () => {
    const elder = await seedRenderData();
    const item = automationActions.create('water', '09:00')!;
    const before = waterToday(elder.id);
    elderAnswers.automationResponse(item.id, E.notYet, elder.id);
    expect(waterToday(elder.id)).toBe(before);
    elderAnswers.automationResponse(item.id, E.waterBtn, elder.id);
    expect(waterToday(elder.id)).toBe(before + 1);
  });

  it(`en comida, "${strings.elder.yes}" la marca y "${strings.elder.notYet}" no`, async () => {
    const elder = await seedRenderData();
    const meal = db.list('meals', testUser.id, elder.id)[0];
    if (!meal) return;
    const item = automationActions.create('meal', meal.time)!;
    elderAnswers.automationResponse(item.id, E.notYet, elder.id);
    expect(db.list('mealLogs', testUser.id, elder.id).find((l) => l.mealId === meal.id)?.answer).toBe('no');
    elderAnswers.automationResponse(item.id, E.yes, elder.id);
    expect(db.list('mealLogs', testUser.id, elder.id).find((l) => l.mealId === meal.id)?.answer).toBe('yes');
  });
});
