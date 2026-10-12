/**
 * Extractor de citas médicas en español: especialidad, médico, institución, dirección colombiana, teléfono, fecha,
 * hora y preguntas para llevar. Puro y determinista; lo que no reconoce queda vacío para que BUDDY lo pregunte.
 */
import type { AssistantAction } from './types';
import { clean, parseDate, parsePhones, parseTimes } from './parse';

/** ¿El texto habla de una cita, un control o un examen con fecha? */
export const APPOINTMENT_INTENT =
  /\bcita\b|\bcontrol (con|de|medico)\b|\bconsulta (con|de|medica)\b|\bexamen(es)? de (sangre|orina|laboratorio)\b|\b(ecografia|radiografia|resonancia|tomografia|mamografia|electrocardiograma)\b/;

const SPECIALTIES: [RegExp, string][] = [
  [/\bcardiolog\w*/, 'Cardiología'],
  [/\bodontolog\w*|\bdentista\b/, 'Odontología'],
  [/\boptometr\w*|\boptometra\b/, 'Optometría'],
  [/\boftalmolog\w*/, 'Oftalmología'],
  [/\blaboratorio\b|\bexamen(es)? de (sangre|orina|laboratorio)\b|\btoma de muestras\b/, 'Laboratorio'],
  [/\b(radiografia|ecografia|resonancia|tomografia|mamografia|imagenes diagnosticas)\b/, 'Imágenes diagnósticas'],
  [/\bmedic[oa] general\b|\bmedicina general\b/, 'Medicina general'],
  [/\bmedicina interna\b|\binternista\b/, 'Medicina interna'],
  [/\bgeriatr\w*/, 'Geriatría'],
  [/\bdermatolog\w*/, 'Dermatología'],
  [/\bfisioterap\w*/, 'Fisioterapia'],
  [/\bpsicolog\w*/, 'Psicología'],
  [/\bpsiquiatr\w*/, 'Psiquiatría'],
  [/\bnutricion\w*/, 'Nutrición'],
  [/\bneurolog\w*/, 'Neurología'],
  [/\bendocrin\w*/, 'Endocrinología'],
  [/\bortoped\w*|\btraumatolog\w*/, 'Ortopedia'],
  [/\burolog\w*/, 'Urología'],
  [/\bginecolog\w*/, 'Ginecología'],
  [/\botorrino\w*/, 'Otorrinolaringología'],
  [/\bneumolog\w*/, 'Neumología'],
  [/\bnefrolog\w*/, 'Nefrología'],
  [/\breumatolog\w*/, 'Reumatología'],
  [/\bgastroenterolog\w*/, 'Gastroenterología'],
  [/\boncolog\w*/, 'Oncología'],
];

const CAP = '[A-ZÁÉÍÓÚÑ][\\wáéíóúñ]*';
/** "Clínica del Country", "Hospital San Ignacio": la palabra clave y los nombres propios que la siguen. */
const INSTITUTION = new RegExp(`\\b([Cc]l[ií]nica|[Hh]ospital|[Cc]entro [Mm][eé]dico|[Ff]undaci[oó]n|[Cc]onsultorio|IPS|EPS)((?:\\s+(?:(?:del?|la|los|las|el)\\s+)?${CAP})+)`);
/** "calle 5 # 10-20", "Carrera 7 # 40-62, Bogotá", "Cra. 15 No. 80-10". */
const ADDRESS = new RegExp(
  `\\b(?:[Cc]alle|[Cc]arrera|[Cc]ra\\.?|[Cc]l\\.?|[Kk]r\\.?|[Aa]venida|[Aa]v\\.?|[Dd]iagonal|[Dd]g\\.?|[Tt]ransversal|[Tt]v\\.?)\\s*\\d+\\s*[A-Za-z]?(?:\\s*bis)?\\s*(?:#|[Nn]o\\.?|[Nn]°)\\s*\\d+\\s*[A-Za-z]?\\s*-\\s*\\d+(?:\\s*,\\s*${CAP}(?:\\s+${CAP})*)?`,
);

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Quita un trozo y la preposición que lo precede: "en la calle 5 # 10-20 mañana" no debe quedar "en la mañana". */
function cut(text: string, piece: string): string {
  const i = text.indexOf(piece);
  return `${text.slice(0, i).replace(/\s*\b(?:en|en la|en el)\s*$/i, '')} ${text.slice(i + piece.length)}`;
}

export function parseAppointment(raw: string, today: Date): Extract<AssistantAction, { type: 'add_appointment' }> {
  // Las preguntas van al final ("…y preguntarle si puede hacer ejercicio"): se separan para no leer horas en ellas.
  const q = raw.match(/[,\s]+(?:y\s+)?preguntar(?:le)?\s+(?:por\s+)?(.+)$/i);
  let rest = q ? raw.slice(0, q.index) : raw;
  const questions = q ? [capitalize(q[1].trim().replace(/[.?¿]+$/g, ''))] : undefined;

  const addr = rest.match(ADDRESS)?.[0];
  if (addr) rest = cut(rest, addr);
  const inst = rest.match(INSTITUTION);
  if (inst) rest = cut(rest, inst[0]);
  const phone = parsePhones(rest)[0]?.phone;
  if (phone) rest = rest.replace(/(?:tel[eé]fono|tel\.?|celular|n[uú]mero)?:?\s*\+?[\d\s-]{7,}\d/i, ' ');

  const t = clean(rest);
  const specialty = SPECIALTIES.find(([re]) => re.test(t))?.[1];
  const doc = rest.match(/\b([Dd]octora?|[Dd]ra?\.?)\s+([A-ZÁÉÍÓÚÑ][\wáéíóúñ]+)/);
  const doctor = doc ? `${/^(doctora|dra)/i.test(doc[1]) ? 'Dra.' : 'Dr.'} ${capitalize(doc[2])}` : undefined;
  const title = specialty ? `Cita de ${specialty.charAt(0).toLowerCase()}${specialty.slice(1)}` : doctor ? `Cita con ${doctor}` : 'Cita médica';

  return {
    type: 'add_appointment',
    title,
    date: parseDate(t, today),
    time: parseTimes(t)[0] ?? null,
    address: addr ? capitalize(addr.trim()) : '',
    ...(specialty ? { specialty } : {}),
    ...(doctor ? { doctor } : {}),
    ...(inst ? { institution: `${capitalize(inst[1])}${inst[2]}`.replace(/\s+/g, ' ') } : {}),
    ...(phone ? { phone } : {}),
    ...(questions ? { questions } : {}),
  };
}
