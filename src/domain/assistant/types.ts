/**
 * Acciones del asistente BUDDY. Son "herramientas" tipadas con su esquema JSON (`TOOL_SCHEMAS`), listas para que un
 * LLM las llame en la Fase 6 (RemoteAssistantEngine) sin cambiar el ejecutor ni la interfaz.
 */
import type { ActivityKind, ClockTime, DoseUnit, MealKind, MedForm, Weekday } from '../types';

export type QueryTopic = 'sleep' | 'mood' | 'medication' | 'water' | 'meals' | 'activity' | 'day' | 'stock' | 'recommendations';

export type AssistantAction =
  | {
      type: 'add_medication';
      name: string;
      strength: string | null;
      doseAmount: number | null;
      doseUnit: DoseUnit;
      form: MedForm;
      times: ClockTime[];
      days: Weekday[];
      everyHours: number | null;
      from: ClockTime | null;
      unitsPerPackage: number | null;
      /** Existencias actuales (unidades). null = no se registran. */
      unitsOnHand?: number | null;
      instructions: string;
      /** Para qué sirve, en palabras del cuidador. */
      purpose?: string;
    }
  | { type: 'update_medication'; match: string; times: ClockTime[] | null; doseAmount: number | null }
  | { type: 'remove_medication'; match: string }
  | { type: 'update_stock'; match: string; units: number; mode: 'add' | 'set'; /** true = las unidades son cajas o frascos. */ boxes?: boolean }
  | { type: 'set_water_goal'; glasses: number; times: ClockTime[] }
  | { type: 'add_activity_goal'; kind: ActivityKind; title: string; time: ClockTime | null; minutes: number | null; days: Weekday[] }
  | { type: 'set_steps_goal'; steps: number }
  | { type: 'add_emergency_contact'; name: string; relation: string; phone: string }
  | { type: 'update_emergency_contact'; match: string; phone: string }
  | { type: 'set_checkin_time'; /** '' = aún sin hora. */ time: ClockTime }
  | { type: 'add_meal_reminder'; meals: { kind: MealKind; time: ClockTime }[] }
  | {
      type: 'add_appointment';
      title: string;
      date: string | null;
      time: ClockTime | null;
      /** Dirección, ciudad y referencia. */
      address?: string;
      /** Especialidad normalizada ("Cardiología", "Laboratorio"…). */
      specialty?: string;
      /** "Dr. Pérez", "Dra. Gómez". */
      doctor?: string;
      /** Clínica u hospital. */
      institution?: string;
      phone?: string;
      /** Preguntas para llevar a la cita. */
      questions?: string[];
    }
  | { type: 'add_note_for_elder'; title: string; time: ClockTime | null; days: Weekday[] }
  | { type: 'send_message'; text: string }
  | { type: 'query_summary'; topic: QueryTopic; match: string | null }
  | { type: 'suggest_routine' }
  | { type: 'open_scan' }
  /** "¿Qué puedes hacer?", "ayuda": se responde con el menú de acciones. */
  | { type: 'show_menu' }
  /** "¿Para qué sirve el losartán?": información verificada con fuente (MedicationKnowledgeService). */
  | { type: 'medication_info'; name: string }
  | { type: 'emergency' };

export type ActionType = AssistantAction['type'];

/** Datos que BUDDY puede preguntar para completar una acción. */
export type FieldKey =
  | 'name'
  | 'doseAmount'
  | 'time'
  | 'days'
  | 'strength'
  | 'unitsPerPackage'
  | 'unitsOnHand'
  | 'instructions'
  | 'purpose'
  | 'match'
  | 'units'
  | 'glasses'
  | 'title'
  | 'date'
  | 'address'
  | 'phone'
  | 'relation'
  | 'steps'
  | 'doctor'
  | 'institution'
  | 'questions';

/** Campo que falta y cómo preguntarlo (con respuestas rápidas). */
export interface MissingField {
  actionIndex: number;
  field: FieldKey;
  question: string;
  quickReplies: string[];
  /** Si es opcional, se puede responder "No sé" u omitir. */
  optional: boolean;
}

export interface Interpretation {
  actions: AssistantAction[];
  missing: MissingField[];
  /** Respuesta directa cuando no hay acciones (no entendió, saludo…). */
  reply: string | null;
  understood: boolean;
}

export interface AssistantContext {
  elderName: string;
  medicationNames: string[];
  contactNames: string[];
  /** Fecha de referencia para "mañana", "el jueves"… (pruebas); por defecto, hoy. */
  today?: Date;
}

export interface AssistantEngine {
  interpret(text: string, context: AssistantContext): Promise<Interpretation>;
}

const time = { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$', description: 'Hora local HH:mm' };
const days = { type: 'array', items: { type: 'integer', minimum: 0, maximum: 6 }, description: '0=domingo…6=sábado; vacío = todos los días' };

/** Esquemas JSON de las herramientas (para tool calling con un LLM en la Fase 6). */
export const TOOL_SCHEMAS: Record<ActionType, { description: string; parameters: object }> = {
  add_medication: {
    description: 'Programa un medicamento con la dosis y horas que dice el cuidador (nunca sugerir dosis).',
    parameters: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string' },
        strength: { type: ['string', 'null'] },
        doseAmount: { type: ['number', 'null'] },
        doseUnit: { enum: ['unit', 'ml', 'drops', 'application'] },
        form: { enum: ['tablet', 'capsule', 'syrup', 'drops', 'cream', 'injection', 'patch', 'other'] },
        times: { type: 'array', items: time },
        days,
        everyHours: { type: ['integer', 'null'] },
        from: { ...time, type: ['string', 'null'] },
        unitsPerPackage: { type: ['integer', 'null'] },
        unitsOnHand: { type: ['integer', 'null'] },
        instructions: { type: 'string' },
        purpose: { type: 'string', description: 'Para qué sirve, en palabras del cuidador (nunca inventado).' },
      },
    },
  },
  update_medication: { description: 'Cambia horas o dosis de un medicamento existente.', parameters: { type: 'object', required: ['match'], properties: { match: { type: 'string' }, times: { type: ['array', 'null'], items: time }, doseAmount: { type: ['number', 'null'] } } } },
  remove_medication: { description: 'Elimina un medicamento (pide confirmación).', parameters: { type: 'object', required: ['match'], properties: { match: { type: 'string' } } } },
  update_stock: { description: 'Suma una compra o fija las existencias.', parameters: { type: 'object', required: ['match', 'units', 'mode'], properties: { match: { type: 'string' }, units: { type: 'number' }, mode: { enum: ['add', 'set'] } } } },
  set_water_goal: { description: 'Meta de vasos de agua al día y sus horas.', parameters: { type: 'object', required: ['glasses'], properties: { glasses: { type: 'integer', minimum: 1, maximum: 14 }, times: { type: 'array', items: time } } } },
  add_activity_goal: { description: 'Meta de actividad (caminar, estirarse…) con hora.', parameters: { type: 'object', required: ['kind', 'title'], properties: { kind: { enum: ['walk', 'stretch', 'air', 'breath', 'music', 'read', 'call', 'custom'] }, title: { type: 'string' }, time: { ...time, type: ['string', 'null'] }, minutes: { type: ['integer', 'null'] }, days } } },
  set_steps_goal: { description: 'Meta de pasos (solo se mide con reloj).', parameters: { type: 'object', required: ['steps'], properties: { steps: { type: 'integer', minimum: 100 } } } },
  add_emergency_contact: { description: 'Contacto de emergencia.', parameters: { type: 'object', required: ['name', 'phone'], properties: { name: { type: 'string' }, relation: { type: 'string' }, phone: { type: 'string', pattern: '^\\d{7,10}$' } } } },
  update_emergency_contact: { description: 'Cambia el teléfono de un contacto.', parameters: { type: 'object', required: ['match', 'phone'], properties: { match: { type: 'string' }, phone: { type: 'string' } } } },
  set_checkin_time: { description: 'Hora del chequeo diario de 3 preguntas.', parameters: { type: 'object', required: ['time'], properties: { time } } },
  add_meal_reminder: { description: 'Horas de comidas.', parameters: { type: 'object', required: ['meals'], properties: { meals: { type: 'array', items: { type: 'object', properties: { kind: { enum: ['breakfast', 'lunch', 'dinner', 'snack'] }, time } } } } } },
  add_appointment: { description: 'Cita médica u otra, con dirección.', parameters: { type: 'object', required: ['title'], properties: { title: { type: 'string' }, date: { type: ['string', 'null'] }, time: { ...time, type: ['string', 'null'] }, address: { type: 'string' } } } },
  add_note_for_elder: { description: 'Recordatorio para el adulto mayor (llamar a alguien, una nota).', parameters: { type: 'object', required: ['title'], properties: { title: { type: 'string' }, time: { ...time, type: ['string', 'null'] }, days } } },
  send_message: { description: 'Mensaje del cuidador que el adulto mayor verá hoy en su pantalla.', parameters: { type: 'object', required: ['text'], properties: { text: { type: 'string', maxLength: 200 } } } },
  query_summary: { description: 'Responde SOLO con registros reales.', parameters: { type: 'object', required: ['topic'], properties: { topic: { enum: ['sleep', 'mood', 'medication', 'water', 'meals', 'activity', 'day', 'stock', 'recommendations'] }, match: { type: ['string', 'null'] } } } },
  suggest_routine: { description: 'Sugerencias generales de bienestar (sin consejos médicos).', parameters: { type: 'object', properties: {} } },
  open_scan: { description: 'Abre la cámara para fotografiar un envase.', parameters: { type: 'object', properties: {} } },
  show_menu: { description: 'Muestra lo que BUDDY puede hacer.', parameters: { type: 'object', properties: {} } },
  medication_info: { description: 'Información general verificada de un medicamento, con fuente. Nunca recomienda dosis.', parameters: { type: 'object', required: ['name'], properties: { name: { type: 'string' } } } },
  emergency: { description: 'Urgencia: recomendar 123 y contacto principal.', parameters: { type: 'object', properties: {} } },
};
