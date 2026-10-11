import type {
  ChatRepository,
  MedicationRepository,
  ProfileRepository,
  VitalsRepository,
  WellbeingRepository,
} from '@/repositories/contracts';
import type { ChatMessage } from '@/types/domain';
import { formatClock, formatRelativeDay, toClock, toISODate } from '@/utils/dates';
import { createId } from '@/utils/id';

import { buildDayPlan, effectiveTime } from '../medications/schedule';
import { doseLabel, strengthLabel } from '../medications/use-cases';
import { entriesOf, formatVitalValue } from '../vitals/use-cases';
import { HABITS, WATER_GOAL } from '../wellbeing/use-cases';

import { initialChat, replyTo, type ChatContext } from './replies';

/** Vuelve a la conversación de bienvenida (solo afecta a este teléfono). */
export function resetChat(repo: ChatRepository, profile: ProfileRepository, now: Date): void {
  repo.replaceAll(initialChat(now, profile.settings().userName));
}

export interface ChatDeps {
  chat: ChatRepository;
  medications: MedicationRepository;
  vitals: VitalsRepository;
  wellbeing: WellbeingRepository;
  profile: ProfileRepository;
}

export function buildChatContext(deps: Omit<ChatDeps, 'chat'>, now: Date): ChatContext {
  const today = toISODate(now);
  const plan = buildDayPlan(deps.medications.listMedications(), deps.medications.listDoses(), today, now);
  const bp = entriesOf(deps.vitals.list(), 'bloodPressure').at(-1) ?? null;
  const done = deps.wellbeing.habitLog()[today] ?? [];
  const bpDate = bp ? new Date(bp.recordedAt) : null;
  return {
    userName: deps.profile.settings().userName,
    lastBloodPressure:
      bp && bpDate
        ? {
            value: formatVitalValue(bp),
            when: `${formatRelativeDay(toISODate(bpDate), today).toLowerCase()}, ${formatClock(toClock(bpDate))}`,
          }
        : null,
    nextDose: plan.next
      ? {
          name: plan.next.medication.name,
          strength: strengthLabel(plan.next.medication),
          dose: doseLabel(plan.next.medication),
          time: formatClock(effectiveTime(plan.next.dose)),
        }
      : null,
    taken: plan.taken,
    total: plan.total,
    glasses: deps.wellbeing.waterLog()[today] ?? 0,
    waterGoal: WATER_GOAL,
    pendingHabits: HABITS.filter((h) => !done.includes(h.id)).map((h) => h.name),
  };
}

export function sendUserMessage(repo: ChatRepository, text: string, now: Date): ChatMessage | null {
  const clean = text.trim().slice(0, 500);
  if (!clean) return null;
  const message: ChatMessage = { id: createId('msg'), from: 'user', text: clean, at: now.toISOString() };
  repo.append(message);
  return message;
}

export function respond(deps: ChatDeps, userText: string, now: Date): ChatMessage {
  const message: ChatMessage = {
    id: createId('msg'),
    from: 'buddy',
    text: replyTo(userText, buildChatContext(deps, now), deps.chat.list().length),
    at: now.toISOString(),
  };
  deps.chat.append(message);
  return message;
}
