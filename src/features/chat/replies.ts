/**
 * Respuestas LOCALES de demostración por reglas simples. No hay IA.
 * Reglas de seguridad: no diagnostica, no indica dosis ni cambios de tratamiento,
 * y ante palabras de urgencia deriva a la línea de emergencias.
 */
import type { ChatMessage } from '@/types/domain';
import { toISODate } from '@/utils/dates';

export interface ChatContext {
  userName: string;
  lastBloodPressure: { value: string; when: string } | null;
  nextDose: { name: string; strength: string; dose: string; time: string } | null;
  taken: number;
  total: number;
  glasses: number;
  waterGoal: number;
  pendingHabits: string[];
}

export const SUGGESTIONS = [
  '¿Cómo está mi presión?',
  '¿Cuál es mi próximo medicamento?',
  'Consejos de salud',
  '¿Qué puedo hacer hoy?',
] as const;

const TIPS = [
  'Toma agua a lo largo del día, aunque no sientas sed.',
  'Una caminata suave de 15 minutos ayuda a sentirse con más energía.',
  'Mantener horarios regulares para dormir ayuda a descansar mejor.',
  'Llamar a alguien querido también es cuidarse.',
];

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[¿?¡!.,]/g, ' ');

const has = (text: string, ...words: string[]) => words.some((w) => text.includes(w));

export const SAFETY_NOTE = 'Soy un asistente de demostración: no reemplazo a un profesional de la salud.';

export function replyTo(input: string, ctx: ChatContext, seed = 0): string {
  const t = norm(input);

  if (has(t, 'dolor de pecho', 'no puedo respirar', 'emergencia', 'urgencia', 'desmay', 'me cai', 'ayuda urgente')) {
    return 'Si es una emergencia, llama ya a la línea de emergencias 123 o pide ayuda a alguien cerca. En Inicio tienes el botón Emergencia con tus contactos. Yo no puedo valorar síntomas.';
  }

  const asksDose =
    has(t, 'dosis', 'dejar de tomar', 'suspend', 'duplic', 'doble', 'aumentar', 'disminuir', 'cambiar mi', 'puedo tomar', 'debo tomar', 'cuantas pastillas', 'cuanto tomo');
  if (asksDose) {
    return 'No puedo indicarte dosis ni cambios en tu tratamiento. Para eso, consulta con tu médico o farmacéutico. Sí puedo recordarte las tomas que tienes registradas.';
  }

  if (has(t, 'presion', 'tension')) {
    return ctx.lastBloodPressure
      ? `Tu último registro manual de presión arterial es ${ctx.lastBloodPressure.value} mmHg (${ctx.lastBloodPressure.when}). Es un dato que registraste tú y no puedo interpretarlo. Si tienes dudas, consulta con tu médico.`
      : 'Aún no tienes registros de presión. Puedes agregar uno manualmente en Salud.';
  }

  if (has(t, 'medicament', 'pastilla', 'toma', 'remedio', 'proximo')) {
    if (!ctx.nextDose) return `No tienes más tomas pendientes hoy. Llevas ${ctx.taken} de ${ctx.total} confirmadas.`;
    const d = ctx.nextDose;
    return `Tu próxima toma registrada es ${d.name} ${d.strength} (${d.dose}) a las ${d.time}. Hoy llevas ${ctx.taken} de ${ctx.total} confirmadas.`;
  }

  if (has(t, 'consejo', 'tip', 'recomend')) {
    return `Un consejo general de bienestar: ${TIPS[seed % TIPS.length]} ${SAFETY_NOTE}`;
  }

  if (has(t, 'que puedo hacer', 'aburr', 'plan', 'hacer hoy')) {
    const ideas = [...ctx.pendingHabits.map((h) => h.toLowerCase())];
    if (ctx.glasses < ctx.waterGoal) ideas.push(`tomar un vaso de agua (llevas ${ctx.glasses} de ${ctx.waterGoal})`);
    return ideas.length
      ? `Hoy podrías: ${ideas.join(', ')}. ¡Pasos pequeños, grandes logros!`
      : '¡Ya completaste tus metas de hoy! Podrías llamar a alguien querido o descansar un rato.';
  }

  if (has(t, 'agua', 'hidrat', 'sed')) {
    return `Llevas ${ctx.glasses} de ${ctx.waterGoal} vasos de agua hoy. Puedes sumar uno en Bienestar.`;
  }

  if (has(t, 'dormi', 'sueno', 'insomn', 'descans')) {
    return 'Puedes registrar cómo dormiste en Sueño. Si el descanso te preocupa, coméntalo con tu médico.';
  }

  if (has(t, 'dolor', 'mareo', 'nausea', 'fatiga', 'me siento mal', 'enferm', 'fiebre')) {
    return 'Lamento que te sientas así. Puedes registrarlo en Síntomas para llevar seguimiento. Si es intenso o no mejora, contacta a un profesional de la salud.';
  }

  if (has(t, 'triste', 'solo', 'sola', 'preocup', 'ansios', 'nervios')) {
    return 'Gracias por contármelo. Estoy contigo. Hablar con alguien de confianza puede ayudar; también puedes registrar tu ánimo en Bienestar.';
  }

  if (has(t, 'bien', 'feliz', 'excelente', 'alegr', 'contento', 'contenta')) {
    return '¡Qué alegría! Tu bienestar también me alegra a mí. ¿Hay algo en lo que pueda ayudarte hoy?';
  }

  if (has(t, 'gracias')) return '¡Con gusto! Siempre contigo.';

  if (has(t, 'hola', 'buenos dias', 'buenas tardes', 'buenas noches', 'buenas')) {
    return `¡Hola, ${ctx.userName}! ¿Cómo te sientes hoy?`;
  }

  return 'Te escucho. Puedo ayudarte con tus medicamentos registrados, tu ánimo, tu sueño y tus registros de salud. Prueba una de las sugerencias.';
}

/** Conversación inicial de ejemplo (FICTICIA). */
export function initialChat(now: Date, userName: string): ChatMessage[] {
  const day = toISODate(now);
  return [
    { id: 'demo-chat-0', from: 'buddy', text: `¡Hola, ${userName}! ¿Cómo te sientes hoy?`, at: `${day}T09:40:00` },
    { id: 'demo-chat-1', from: 'user', text: 'Me siento muy bien hoy', at: `${day}T09:41:00` },
    {
      id: 'demo-chat-2',
      from: 'buddy',
      text: '¡Qué alegría! Tu bienestar también me alegra a mí. ¿Hay algo en lo que pueda ayudarte hoy?',
      at: `${day}T09:41:30`,
    },
  ];
}
