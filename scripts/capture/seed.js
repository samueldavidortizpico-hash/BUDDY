/**
 * Datos SINTÉTICOS para capturas web ([PRUEBA]): una cuenta y una persona ficticia con N días de respuestas.
 * Se escriben en localStorage (en web, AsyncStorage y el almacén "seguro" de desarrollo usan localStorage).
 * Nunca se usan fuera de las capturas.
 */
function seedState({ days = 0, mood = 'bad', sleep = 'bad', full = false } = {}) {
  const now = new Date();
  const iso = now.toISOString();
  const d = (n) => { const x = new Date(now); x.setDate(x.getDate() - n); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
  const user = { id: 'cap-user', email: 'prueba@buddy.test', name: 'Laura Prueba', createdAt: iso, role: 'caregiver' };
  const meta = (id, elderId) => ({ id, ownerUserId: user.id, elderId, createdBy: user.id, createdAt: iso, updatedAt: iso, deletedAt: null, syncStatus: 'local' });
  const alertPrefs = Object.fromEntries(['dose_unconfirmed','stock_low','stock_out','allergy_match','duplicate_ingredient','schedule_overlap','help_requested','checkin_unwell'].map((k) => [k, true]));
  const elder = { ...meta('cap-elder', 'cap-elder'), firstName: 'Elis', lastName: '[PRUEBA]', gender: 'female', birthDate: null, age: 80, weightKg: null, heightCm: null, relation: 'mother', relationOther: '', allergies: [], conditions: [], avoid: [], surgeries: [], insurer: '', doctor: '', dietRestrictions: [], foodAllergies: [], checkinTime: '10:00', summaries: 'daily', alertPrefs, screen: { textScale: 'large', appearance: 'auto', voice: false, voiceRate: 0.9, maxSnoozes: 2 }, equivalences: {}, setupStep: 8, setupDone: true };
  const account = { ...meta('cap-account', null), activeElderId: 'cap-elder', pinHash: null, pinSalt: null, myAlerts: alertPrefs, permissions: { camera: false, notifications: false, health: false }, demoMode: false };
  const checkins = {};
  for (let i = 0; i < days; i++) checkins[`cap-c${i}`] = { ...meta(`cap-c${i}`, 'cap-elder'), date: d(i), mood, sleep, unwell: false };
  const empty = ['medications','doses','stock','waterPlans','water','meals','mealLogs','activities','activityLogs','contacts','reminders','appointments','alerts','messages'];
  const extra = {};
  if (full) {
    const tomorrow = d(-1);
    extra.medications = { 'cap-m1': { ...meta('cap-m1', 'cap-elder'), name: 'Losartán [PRUEBA]', activeIngredient: '', strength: '50 mg', form: 'tablet', doseAmount: 1, doseUnit: 'unit', schedule: { kind: 'times', times: ['08:00', '20:00'], days: [] }, startDate: d(10), endDate: null, instructions: 'Con comida', purpose: 'Para la presión', description: '', unitsPerPackage: 30, unitsOnHand: 4, refillAlertDays: 7, photoUri: null, paused: false } };
    extra.doses = { 'cap-d1': { ...meta('cap-d1', 'cap-elder'), medicationId: 'cap-m1', date: d(0), time: '08:00', status: 'pending', respondedAt: null, snoozedTo: null, snoozeCount: 0, answeredBy: null } };
    extra.waterPlans = { 'cap-w': { ...meta('cap-w', 'cap-elder'), glasses: 8, times: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '19:00', '20:00'] } };
    extra.meals = { 'cap-meal': { ...meta('cap-meal', 'cap-elder'), kind: 'breakfast', time: '07:30' } };
    extra.contacts = { 'cap-ct': { ...meta('cap-ct', 'cap-elder'), name: 'Juan Prueba', relation: 'Hijo', phone: '3001234567', primary: true } };
    extra.appointments = { 'cap-ap': { ...meta('cap-ap', 'cap-elder'), title: 'Cita con cardiología [PRUEBA]', date: tomorrow, time: '10:00', place: 'Calle 10 # 5-20, consultorio 302', city: 'Bogotá', reference: 'frente al parque principal', phone: '6015550000', notes: '', questions: [] } };
  }
  const state = { accounts: { [account.id]: account }, elders: { [elder.id]: elder }, checkins, drafts: {}, handoff: null, lastPulledAt: {} };
  for (const c of empty) state[c] = extra[c] ?? {};
  return { session: user, db: { state, version: 2 } };
}
module.exports = { seedState };
