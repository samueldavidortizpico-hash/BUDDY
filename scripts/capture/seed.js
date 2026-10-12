/**
 * Datos SINTÉTICOS para capturas web ([PRUEBA]): una cuenta y una persona ficticia con N días de respuestas.
 * Se escriben en localStorage (en web, AsyncStorage y el almacén "seguro" de desarrollo usan localStorage).
 * Nunca se usan fuera de las capturas.
 */
function seedState({ days = 0, mood = 'bad', sleep = 'bad' } = {}) {
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
  const state = { accounts: { [account.id]: account }, elders: { [elder.id]: elder }, checkins, drafts: {}, handoff: null, lastPulledAt: {} };
  for (const c of empty) state[c] = {};
  return { session: user, db: { state, version: 2 } };
}
module.exports = { seedState };
