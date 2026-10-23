import type { Reminder } from '@/domain/types';
import { db } from '@/infrastructure/local/db';

import { activeElderId, actor } from './actions';
import { currentUserId } from './session';

export const automationQuestion = (kind: NonNullable<Reminder['automation']>['kind'], medicationName?: string) => {
  const questions: Record<NonNullable<Reminder['automation']>['kind'], string> = {
    mood: '¿Cómo te sientes?', sleep: '¿Cómo dormiste?', emotional: '¿Te sientes mal emocionalmente?',
    water: '¿Ya tomaste agua?', meal: '¿Ya comiste?', walk: '¿Hiciste tu caminata?', medication_alert: `Avisar si no toma ${medicationName ?? 'su medicamento'}`,
  };
  return questions[kind];
};

export const automationActions = {
  list(): Reminder[] {
    const id = activeElderId();
    return id ? db.list('reminders', currentUserId(), id).filter((r) => !!r.automation) : [];
  },
  create(kind: NonNullable<Reminder['automation']>['kind'], time: string, medicationId?: string, days: Reminder['days'] = []) {
    const elderId = activeElderId();
    if (!elderId) return null;
    const med = medicationId ? db.get('medications', medicationId) : undefined;
    return db.insert('reminders', { title: automationQuestion(kind, med?.name), time, days, date: null, automation: { kind, enabled: true, medicationId } }, actor(elderId));
  },
  setEnabled(kind: NonNullable<Reminder['automation']>['kind'], enabled: boolean, id?: string) {
    const item = this.list().find((r) => r.automation?.kind === kind && (!id || r.id === id));
    return item ? db.update('reminders', item.id, { automation: { ...item.automation!, enabled } }) : undefined;
  },
  setTime(kind: NonNullable<Reminder['automation']>['kind'], time: string, id?: string) {
    const item = this.list().find((r) => r.automation?.kind === kind && (!id || r.id === id));
    return item ? db.update('reminders', item.id, { time }) : undefined;
  },
  remove(id: string) {
    if (!this.list().some((r) => r.id === id)) return;
    db.remove('reminders', id);
  },
};
