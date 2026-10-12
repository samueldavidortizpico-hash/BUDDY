/**
 * Corpus de comprensión del LocalAssistantEngine (V2.4). Las respuestas esperadas se escribieron ANTES de medir y no se
 * ajustan para subir el acierto: si una frase falla, se corrige el motor o se documenta en docs/AUDITORIA_V2_4.md.
 *
 * Referencia: hoy es lunes 12 de octubre de 2026. Contexto: medicamentos Losartán, Metformina y Atorvastatina;
 * contactos Juan y Marta. Solo se comparan los campos escritos en `expect` (la acción del mismo tipo).
 * `understood: false` = BUDDY no debe inventar una acción (muestra el menú y ejemplos).
 */
import type { AssistantAction } from '@/domain/assistant/types';

type Expected = ({ type: AssistantAction['type'] } & Record<string, unknown>) | { understood: false };
export interface CorpusCase {
  group: 'cita' | 'medicamento' | 'agua' | 'contacto' | 'meta' | 'comida' | 'consulta' | 'edicion' | 'mensaje' | 'otro';
  text: string;
  expect: Expected;
}

export const CORPUS_TODAY = new Date(2026, 9, 12, 9, 0);
export const CORPUS_CONTEXT = { elderName: 'Rosa', medicationNames: ['Losartán', 'Metformina', 'Atorvastatina'], contactNames: ['Juan', 'Marta'], today: CORPUS_TODAY };

const cita = (text: string, expect: Record<string, unknown>): CorpusCase => ({ group: 'cita', text, expect: { type: 'add_appointment', ...expect } });
const med = (text: string, expect: Record<string, unknown>): CorpusCase => ({ group: 'medicamento', text, expect: { type: 'add_medication', ...expect } });
const c = (group: CorpusCase['group'], text: string, expect: Expected): CorpusCase => ({ group, text, expect });

export const CORPUS: CorpusCase[] = [
  // ── Citas (32) ──
  cita('Cita con el cardiólogo mañana a las 3 de la tarde', { specialty: 'Cardiología', date: '2026-10-13', time: '15:00' }),
  cita('agenda una cita médica el jueves a las 10 de la mañana', { date: '2026-10-15', time: '10:00' }),
  cita('ponle cita con el odontólogo el 15 de noviembre a las 9 am', { specialty: 'Odontología', date: '2026-11-15', time: '09:00' }),
  cita('cita de laboratorio pasado mañana a las 7 am', { specialty: 'Laboratorio', date: '2026-10-14', time: '07:00' }),
  cita('tiene examen de sangre el viernes a las 6:30 am', { specialty: 'Laboratorio', date: '2026-10-16', time: '06:30' }),
  cita('Recuérdale que tiene cita con la optómetra el 3 de diciembre a las 2 pm', { specialty: 'Optometría', date: '2026-12-03', time: '14:00' }),
  cita('cita con el doctor Pérez mañana a las 8', { doctor: 'Dr. Pérez', date: '2026-10-13', time: '08:00' }),
  cita('cita con la doctora Gómez el lunes 20 de octubre a las 11', { doctor: 'Dra. Gómez', date: '2026-10-20', time: '11:00' }),
  cita('cita de medicina general en la Clínica Imbanaco el miércoles a las 4 de la tarde', { specialty: 'Medicina general', institution: 'Clínica Imbanaco', date: '2026-10-14', time: '16:00' }),
  cita('cita con el cardiólogo en la calle 5 # 10-20 mañana a las 9 am', { specialty: 'Cardiología', address: 'Calle 5 # 10-20', date: '2026-10-13', time: '09:00' }),
  cita('programa cita de geriatría el 2 de noviembre a las 10:30 en el Hospital San Ignacio, carrera 7 # 40-62', {
    specialty: 'Geriatría',
    date: '2026-11-02',
    time: '10:30',
    institution: 'Hospital San Ignacio',
    address: 'Carrera 7 # 40-62',
  }),
  cita('cita con el dermatólogo en dos semanas a las 3 pm', { specialty: 'Dermatología', date: '2026-10-26', time: '15:00' }),
  cita('tiene control con el médico general el próximo viernes a las 8 de la mañana', { specialty: 'Medicina general', date: '2026-10-16', time: '08:00' }),
  cita('cita odontologia mañana 10 am', { specialty: 'Odontología', date: '2026-10-13', time: '10:00' }),
  cita('cita con el cardiologo el 15 de noviembre a las 3 de la tarde, telefono 6015551234', { specialty: 'Cardiología', date: '2026-11-15', time: '15:00', phone: '6015551234' }),
  cita('agrega una cita con fisioterapia el martes a las 5 pm', { specialty: 'Fisioterapia', date: '2026-10-13', time: '17:00' }),
  cita('cita con el oftalmólogo hoy a las 4 pm', { specialty: 'Oftalmología', date: '2026-10-12', time: '16:00' }),
  cita('cita con el psicólogo el sábado a las 10 am', { specialty: 'Psicología', date: '2026-10-17', time: '10:00' }),
  cita('cita con la nutricionista el 28 de octubre a las 2 de la tarde', { specialty: 'Nutrición', date: '2026-10-28', time: '14:00' }),
  cita('cita con el neurólogo el 5 de enero a las 9 de la mañana', { specialty: 'Neurología', date: '2027-01-05', time: '09:00' }),
  cita('cita con el endocrino mañana a las 7:30 am en la Clínica del Country', { specialty: 'Endocrinología', date: '2026-10-13', time: '07:30', institution: 'Clínica del Country' }),
  cita('cita de ortopedia el jueves a las 3 y media de la tarde', { specialty: 'Ortopedia', date: '2026-10-15', time: '15:30' }),
  cita('cita con el urólogo el 30 de octubre a las 11 am, preguntar por los resultados del examen', { specialty: 'Urología', date: '2026-10-30', time: '11:00', questions: ['Los resultados del examen'] }),
  cita('agenda cita con el médico general el viernes a las 9 am y preguntarle si puede hacer ejercicio', { specialty: 'Medicina general', date: '2026-10-16', time: '09:00', questions: ['Si puede hacer ejercicio'] }),
  cita('cita con el ginecólogo el 12 de noviembre a las 8 am', { specialty: 'Ginecología', date: '2026-11-12', time: '08:00' }),
  cita('cita con el otorrino el miércoles a las 2 pm', { specialty: 'Otorrinolaringología', date: '2026-10-14', time: '14:00' }),
  cita('cita de radiografía mañana a las 6 am', { specialty: 'Imágenes diagnósticas', date: '2026-10-13', time: '06:00' }),
  cita('cita con el neumólogo el próximo lunes a las 10 am', { specialty: 'Neumología', date: '2026-10-19', time: '10:00' }),
  cita('cita de medicina interna en la calle 50 # 8-24, Bogotá, el 18 de octubre a las 9:15 am', { specialty: 'Medicina interna', address: 'Calle 50 # 8-24, Bogotá', date: '2026-10-18', time: '09:15' }),
  cita('pon una cita con el cardiólogo', { specialty: 'Cardiología', date: null, time: null }),
  cita('tiene cita mañana', { date: '2026-10-13', time: null }),
  cita('ecografía el 22 de octubre a las 7 am', { specialty: 'Imágenes diagnósticas', date: '2026-10-22', time: '07:00' }),

  // ── Medicamentos (32, con errores de ortografía) ──
  med('ponle losartán a las 6 de la tarde todos los días', { name: 'Losartán', times: ['18:00'], days: [] }),
  med('agrega metformina 850 mg una tableta en el desayuno y la cena', { name: 'Metformina', strength: '850 mg', doseAmount: 1, times: ['07:30', '18:30'] }),
  med('agrega dolex', { name: 'Dolex', doseAmount: null, times: [] }),
  med('agraga dolex', { name: 'Dolex' }),
  med('progama atorvastatina 20 mg a las 8 de la noche', { name: 'Atorvastatina', strength: '20 mg', times: ['20:00'] }),
  med('añade omeprazol en ayunas a las 7 am', { name: 'Omeprazol', times: ['07:00'], instructions: 'En ayunas' }),
  med('ponle media tableta de enalapril cada 12 horas desde las 8', { name: 'Enalapril', doseAmount: 0.5, everyHours: 12, from: '08:00' }),
  med('pon una y media pastilla de levotiroxina a las 6 am', { name: 'Levotiroxina', doseAmount: 1.5, times: ['06:00'] }),
  med('recuérdale tomar acetaminofén cada 8 horas', { name: 'Acetaminofén', everyHours: 8 }),
  med('registra amlodipino 5 mg dos veces al día', { name: 'Amlodipino', strength: '5 mg', times: ['08:00', '20:00'] }),
  med('anota que tome aspirina 100 mg con el almuerzo', { name: 'Aspirina', strength: '100 mg', times: ['12:30'] }),
  med('configura 10 gotas de ibuprofeno a las 2 pm', { name: 'Ibuprofeno', doseAmount: 10, doseUnit: 'drops', times: ['14:00'] }),
  med('ponle 5 ml de jarabe de ambroxol a las 8 am y 8 pm', { name: 'Ambroxol', doseAmount: 5, doseUnit: 'ml', times: ['08:00', '20:00'] }),
  med('agrega losartan de 50 mg', { name: 'Losartán', strength: '50 mg' }),
  med('agregale metoprolol los lunes miércoles y viernes a las 9 am', { name: 'Metoprolol', days: [1, 3, 5], times: ['09:00'] }),
  med('ponle vitamina d los domingos a las 10 am', { name: 'Vitamina D', days: [0], times: ['10:00'] }),
  med('quiero que tome glibenclamida antes del desayuno', { name: 'Glibenclamida', times: ['07:30'] }),
  med('necesita tomar sertralina 50 mg en la mañana', { name: 'Sertralina', strength: '50 mg', times: ['08:00'] }),
  med('pon clopidogrel 75 mg 1 tableta al día', { name: 'Clopidogrel', strength: '75 mg', doseAmount: 1 }),
  med('agrega insulina', { name: 'Insulina' }),
  med('ponle dolex forte cada 6 horas', { name: 'Dolex Forte', everyHours: 6 }),
  med('agrega advil a las 3 pm', { name: 'Advil', times: ['15:00'] }),
  med('pon 2 tabletas de calcio a las 12', { name: 'Calcio', doseAmount: 2, times: ['12:00'] }),
  med('agrega un medicamento', { name: '' }),
  med('ponle losartn a las 8 am', { name: 'Losartán', times: ['08:00'] }),
  med('agrega metformna 500 mg', { name: 'Metformina', strength: '500 mg' }),
  med('ponlee atorvastatna a las 9 pm', { name: 'Atorvastatina', times: ['21:00'] }),
  med('añadele tramadol 50 mg cada 8 horas desde las 6 am', { name: 'Tramadol', strength: '50 mg', everyHours: 8, from: '06:00' }),
  med('pon furosemida 40 mg de lunes a viernes a las 7 am', { name: 'Furosemida', days: [1, 2, 3, 4, 5], times: ['07:00'] }),
  med('agrega crema de diclofenaco a las 9 pm', { name: 'Diclofenaco', form: 'cream', times: ['21:00'] }),
  med('ponle naproxeno con comida a la 1 de la tarde', { name: 'Naproxeno', times: ['13:00'], instructions: 'Con comida' }),
  med('agrega captopril 25 mg tres veces al día', { name: 'Captopril', strength: '25 mg', times: ['08:00', '14:00', '20:00'] }),

  // ── Agua (10) ──
  c('agua', 'ponle 8 vasos de agua al día', { type: 'set_water_goal', glasses: 8 }),
  c('agua', 'programa agua', { type: 'set_water_goal', glasses: 0 }),
  c('agua', 'que tome 6 vasos de agua', { type: 'set_water_goal', glasses: 6 }),
  c('agua', 'meta de agua de 10 vasos', { type: 'set_water_goal', glasses: 10 }),
  c('agua', 'recuérdale tomar agua', { type: 'set_water_goal', glasses: 0 }),
  c('agua', 'agua 8 vasos diarios', { type: 'set_water_goal', glasses: 8 }),
  c('agua', 'ponle ocho vasos de agua', { type: 'set_water_goal', glasses: 8 }),
  c('agua', 'configura el agua a 7 vasos', { type: 'set_water_goal', glasses: 7 }),
  c('agua', 'que beba 5 vasos de agua al día', { type: 'set_water_goal', glasses: 5 }),
  c('agua', 'agregale agua', { type: 'set_water_goal', glasses: 0 }),

  // ── Contactos (10) ──
  c('contacto', 'configúrale de emergencia a Juan, su hijo, 300 123 4567', { type: 'add_emergency_contact', name: 'Juan', relation: 'Hijo', phone: '3001234567' }),
  c('contacto', 'agrega contacto de emergencia Marta su hija 3109876543', { type: 'add_emergency_contact', name: 'Marta', relation: 'Hija', phone: '3109876543' }),
  c('contacto', 'contacto de emergencia: vecina Luz 3201112233', { type: 'add_emergency_contact', name: 'Luz', relation: 'Vecina', phone: '3201112233' }),
  c('contacto', 'agrega a Pedro como contacto, teléfono 315 222 3344', { type: 'add_emergency_contact', name: 'Pedro', phone: '3152223344' }),
  c('contacto', 'el número de su nieto Andrés es 3004445566, ponlo de emergencia', { type: 'add_emergency_contact', name: 'Andrés', relation: 'Nieto', phone: '3004445566' }),
  c('contacto', 'agrega un contacto de emergencia', { type: 'add_emergency_contact', name: '', phone: '' }),
  c('contacto', 'cámbiale el teléfono a Juan: 3017778899', { type: 'update_emergency_contact', match: 'Juan', phone: '3017778899' }),
  c('contacto', 'ponle de emergencia a su esposo Carlos 3125556677', { type: 'add_emergency_contact', name: 'Carlos', relation: 'Esposo', phone: '3125556677' }),
  c('contacto', 'contacto de emergencia Sofía, su sobrina, 311 000 1122', { type: 'add_emergency_contact', name: 'Sofía', relation: 'Sobrina', phone: '3110001122' }),
  c('contacto', 'añade contacto Elena vecina 3209998877', { type: 'add_emergency_contact', name: 'Elena', relation: 'Vecina', phone: '3209998877' }),

  // ── Metas y actividades (10) ──
  c('meta', 'ponle una meta de caminar 15 minutos a las 5', { type: 'add_activity_goal', kind: 'walk', minutes: 15, time: '17:00' }),
  c('meta', 'que camine 30 minutos todos los días a las 7 am', { type: 'add_activity_goal', kind: 'walk', minutes: 30, time: '07:00' }),
  c('meta', 'meta de 3000 pasos', { type: 'set_steps_goal', steps: 3000 }),
  c('meta', 'agrega estiramientos a las 9 am', { type: 'add_activity_goal', kind: 'stretch', time: '09:00' }),
  c('meta', 'que escuche música a las 4 de la tarde', { type: 'add_activity_goal', kind: 'music', time: '16:00' }),
  c('meta', 'ponle leer un rato a las 8 pm', { type: 'add_activity_goal', kind: 'read', time: '20:00' }),
  c('meta', 'meta de 5 mil pasos al día', { type: 'set_steps_goal', steps: 5000 }),
  c('meta', 'programa una caminata por el parque los sábados a las 8 am', { type: 'add_activity_goal', kind: 'walk', days: [6], time: '08:00' }),
  c('meta', 'ejercicios de respiración a las 10 am', { type: 'add_activity_goal', kind: 'breath', time: '10:00' }),
  c('meta', 'que salga a tomar el sol a las 9 de la mañana', { type: 'add_activity_goal', kind: 'air', time: '09:00' }),

  // ── Comidas (8) ──
  c('comida', 'desayuno a las 7 y almuerzo a la 1', { type: 'add_meal_reminder', meals: [{ kind: 'breakfast', time: '07:00' }, { kind: 'lunch', time: '13:00' }] }),
  c('comida', 'ponle la cena a las 7 de la noche', { type: 'add_meal_reminder', meals: [{ kind: 'dinner', time: '19:00' }] }),
  c('comida', 'recuérdale almorzar a las 12:30', { type: 'add_meal_reminder', meals: [{ kind: 'lunch', time: '12:30' }] }),
  c('comida', 'agrega la merienda a las 4', { type: 'add_meal_reminder', meals: [{ kind: 'snack', time: '16:00' }] }),
  c('comida', 'programa desayuno, almuerzo y cena', { type: 'add_meal_reminder', meals: [{ kind: 'breakfast', time: '07:30' }, { kind: 'lunch', time: '12:30' }, { kind: 'dinner', time: '18:30' }] }),
  c('comida', 'desayuno a las 8 am', { type: 'add_meal_reminder', meals: [{ kind: 'breakfast', time: '08:00' }] }),
  c('comida', 'cena a las 6 y media de la tarde', { type: 'add_meal_reminder', meals: [{ kind: 'dinner', time: '18:30' }] }),
  c('comida', 'que almuerce a la 1 de la tarde', { type: 'add_meal_reminder', meals: [{ kind: 'lunch', time: '13:00' }] }),

  // ── Consultas (13) ──
  c('consulta', '¿cómo durmió anoche?', { type: 'query_summary', topic: 'sleep' }),
  c('consulta', '¿ya tomó el losartán?', { type: 'query_summary', topic: 'medication', match: 'Losartán' }),
  c('consulta', '¿cuántas pastillas de metformina quedan?', { type: 'query_summary', topic: 'stock', match: 'Metformina' }),
  c('consulta', '¿cómo está de ánimo?', { type: 'query_summary', topic: 'mood' }),
  c('consulta', '¿cuánta agua ha tomado hoy?', { type: 'query_summary', topic: 'water' }),
  c('consulta', 'resumen del día', { type: 'query_summary', topic: 'day' }),
  c('consulta', '¿comió hoy?', { type: 'query_summary', topic: 'meals' }),
  c('consulta', '¿alguna recomendación hoy?', { type: 'query_summary', topic: 'recommendations' }),
  c('consulta', '¿caminó hoy?', { type: 'query_summary', topic: 'activity' }),
  c('consulta', '¿qué puedes hacer?', { type: 'show_menu' }),
  c('consulta', 'ayuda', { type: 'show_menu' }),
  c('consulta', '¿para qué sirve el losartán?', { type: 'medication_info', name: 'Losartán' }),
  c('consulta', '¿qué es el dolex?', { type: 'medication_info', name: 'Dolex' }),

  // ── Edición, existencias y bajas (10) ──
  c('edicion', 'quítale el losartán', { type: 'remove_medication', match: 'Losartán' }),
  c('edicion', 'quitale el losartam', { type: 'remove_medication', match: 'Losartán' }),
  c('edicion', 'cámbiale la metformina a las 9 pm', { type: 'update_medication', match: 'Metformina', times: ['21:00'] }),
  c('edicion', 'compré 30 pastillas de losartán', { type: 'update_stock', match: 'Losartán', units: 30, mode: 'add' }),
  c('edicion', 'compré 2 cajas de metformina', { type: 'update_stock', match: 'Metformina', units: 2, boxes: true }),
  c('edicion', 'suspende la atorvastatina', { type: 'remove_medication', match: 'Atorvastatina' }),
  c('edicion', 'mueve el losartán a las 7 de la noche', { type: 'update_medication', match: 'Losartán', times: ['19:00'] }),
  c('edicion', 'compramos 60 tabletas de atorvastatina', { type: 'update_stock', match: 'Atorvastatina', units: 60 }),
  c('edicion', 'elimina la metformna', { type: 'remove_medication', match: 'Metformina' }),
  c('edicion', 'cambia la dosis de losartán a media tableta', { type: 'update_medication', match: 'Losartán', doseAmount: 0.5 }),

  // ── Mensajes, recordatorios y chequeo (8) ──
  c('mensaje', 'recuérdale llamar a su nieta los domingos a las 5', { type: 'add_note_for_elder', title: 'Llamar a su nieta', days: [0], time: '17:00' }),
  c('mensaje', 'mándale un mensaje: te quiero mucho mamá', { type: 'send_message', text: 'Te quiero mucho mamá' }),
  c('mensaje', 'dile que la llamo a las 5', { type: 'send_message', text: 'La llamo a las 5' }),
  c('mensaje', 'chequeo diario a las 10 am', { type: 'set_checkin_time', time: '10:00' }),
  c('mensaje', 'ponle las preguntas del chequeo a las 4 de la tarde', { type: 'set_checkin_time', time: '16:00' }),
  c('mensaje', 'recuérdale regar las plantas a las 9 am', { type: 'add_note_for_elder', title: 'Regar las plantas', time: '09:00' }),
  c('mensaje', 'escríbele que mañana voy a visitarla', { type: 'send_message', text: 'Mañana voy a visitarla' }),
  c('mensaje', 'recordatorio de pagar el recibo de la luz el viernes a las 10 am', { type: 'add_note_for_elder', title: 'Pagar el recibo de la luz', days: [5], time: '10:00' }),

  // ── Urgencias, cámara y frases sin sentido (5) ──
  c('otro', 'se cayó y no se puede levantar', { type: 'emergency' }),
  c('otro', 'tiene dolor en el pecho', { type: 'emergency' }),
  c('otro', 'escanea la caja del medicamento', { type: 'open_scan' }),
  c('otro', 'hola', { understood: false }),
  c('otro', 'asdf qwer', { understood: false }),
];

/**
 * Conjunto RESERVADO: frases escritas después de corregir el motor y medidas una sola vez, sin ajustar nada después.
 * Su acierto se informa (no se exige) porque es la estimación honesta de cómo generaliza el intérprete.
 */
export const HELDOUT: CorpusCase[] = [
  cita('mi mamá tiene cita con el cardiólogo el viernes a las 2 de la tarde', { specialty: 'Cardiología', date: '2026-10-16', time: '14:00' }),
  cita('apunta cita odontológica el 9 de noviembre a las 8:30 am', { specialty: 'Odontología', date: '2026-11-09', time: '08:30' }),
  cita('control de la tensión con el médico general mañana a las 7 am', { specialty: 'Medicina general', date: '2026-10-13', time: '07:00' }),
  cita('tiene que ir al laboratorio en 3 días a las 6 am', { specialty: 'Laboratorio', date: '2026-10-15', time: '06:00' }),
  cita('cita con el doctor Ramírez en el Hospital Universitario el 1 de diciembre a las 10', { doctor: 'Dr. Ramírez', institution: 'Hospital Universitario', date: '2026-12-01', time: '10:00' }),
  cita('consulta con la dermatóloga el jueves 22 de octubre a las 4:30 pm', { specialty: 'Dermatología', date: '2026-10-22', time: '16:30' }),
  med('ponle losartán de 100 mg a las 7 de la mañana', { name: 'Losartán', strength: '100 mg', times: ['07:00'] }),
  med('agrega acetaminofen 500 mg cada 6 horas', { name: 'Acetaminofen', strength: '500 mg', everyHours: 6 }),
  med('programale media pastilla de bisoprolol en la mañana', { name: 'Bisoprolol', doseAmount: 0.5, times: ['08:00'] }),
  med('agregar metformna con el almuerzo', { name: 'Metformina', times: ['12:30'] }),
  med('registra 2 capsulas de omega 3 en el desayuno', { name: 'Omega', doseAmount: 2, times: ['07:30'] }),
  med('anade losartán a las 9 pm de lunes a viernes', { name: 'Losartán', times: ['21:00'], days: [1, 2, 3, 4, 5] }),
  c('agua', 'ponle meta de 9 vasos de agua', { type: 'set_water_goal', glasses: 9 }),
  c('agua', 'que tome agua', { type: 'set_water_goal', glasses: 0 }),
  c('contacto', 'agrega a su hermana Clara de emergencia 3001239876', { type: 'add_emergency_contact', name: 'Clara', relation: 'Hermana', phone: '3001239876' }),
  c('meta', 'que camine 20 minutos a las 6 de la tarde', { type: 'add_activity_goal', kind: 'walk', minutes: 20, time: '18:00' }),
  c('comida', 'la cena a las 7 pm', { type: 'add_meal_reminder', meals: [{ kind: 'dinner', time: '19:00' }] }),
  c('consulta', '¿cómo amaneció hoy?', { type: 'query_summary', topic: 'mood' }),
  c('consulta', '¿para qué es la metformina?', { type: 'medication_info', name: 'Metformina' }),
  c('consulta', '¿qué sabes hacer?', { type: 'show_menu' }),
  c('edicion', 'compré 3 cajas de losartán', { type: 'update_stock', match: 'Losartán', units: 3, boxes: true }),
  c('edicion', 'cámbiale el losartán a las 10 de la noche', { type: 'update_medication', match: 'Losartán', times: ['22:00'] }),
  c('mensaje', 'recuérdale llamar al doctor el lunes a las 9 am', { type: 'add_note_for_elder', title: 'Llamar al doctor', days: [1], time: '09:00' }),
  c('otro', 'buenas tardes', { understood: false }),
];
