/** Autenticación local, ejecutor de acciones de BUDDY, existencias al confirmar y PIN de entrega. */
import { AuthError } from '@/domain/auth';
import { db, useDb } from '@/infrastructure/local/db';
import { createLocalAuthProvider } from '@/infrastructure/local/auth';
import { elderActions } from '@/state/actions';
import { answerQuery, execute, interpret } from '@/state/assistant';
import { doseActions } from '@/state/care';
import { handoffActions } from '@/state/handoff';
import { ensureAccount, useSession } from '@/state/session';

describe('LocalAuthProvider', () => {
  const auth = createLocalAuthProvider();

  it('crea la cuenta, guarda la sesión e inicia sesión de nuevo', async () => {
    const u = await auth.signUp({ name: 'Laura', email: 'Laura@Correo.com', password: 'Segura123' });
    expect(u.email).toBe('laura@correo.com');
    expect((await auth.getSession())?.id).toBe(u.id);
    await auth.signOut();
    expect(await auth.getSession()).toBeNull();
    expect((await auth.signIn({ email: 'laura@correo.com', password: 'Segura123' })).id).toBe(u.id);
  });

  it('rechaza contraseñas débiles y correos repetidos', async () => {
    await expect(auth.signUp({ name: 'X', email: 'x@correo.com', password: 'corta' })).rejects.toMatchObject({ code: 'weak_password' });
    await expect(auth.signUp({ name: 'L', email: 'laura@correo.com', password: 'OtraSegura1' })).rejects.toMatchObject({ code: 'email_taken' });
  });

  it('el error no revela si el correo existe y bloquea tras 5 intentos', async () => {
    await expect(auth.signIn({ email: 'nadie@correo.com', password: 'Segura123' })).rejects.toMatchObject({ code: 'invalid_credentials' });
    for (let i = 0; i < 4; i++) await expect(auth.signIn({ email: 'laura@correo.com', password: 'mal' })).rejects.toMatchObject({ code: 'invalid_credentials' });
    const locked = await auth.signIn({ email: 'laura@correo.com', password: 'mal' }).catch((e: AuthError) => e);
    expect(locked).toBeInstanceOf(AuthError);
    expect((locked as AuthError).code).toBe('locked');
    await expect(auth.signIn({ email: 'laura@correo.com', password: 'Segura123' })).rejects.toMatchObject({ code: 'locked' });
  });

  it('elimina la cuenta con su contraseña', async () => {
    await auth.signUp({ name: 'Ana', email: 'ana@correo.com', password: 'Segura123' });
    await auth.deleteAccount('Segura123');
    expect(await auth.getSession()).toBeNull();
    await expect(auth.signIn({ email: 'ana@correo.com', password: 'Segura123' })).rejects.toMatchObject({ code: 'invalid_credentials' });
  });
});

describe('ejecutor de BUDDY y casos de uso', () => {
  const user = { id: 'user-1', email: 'c@correo.com', name: 'Cuidador', createdAt: '' };

  beforeAll(() => {
    useDb.setState({ elders: {}, medications: {}, doses: {}, contacts: {}, waterPlans: {}, accounts: {}, activities: {}, meals: {}, alerts: {} } as never);
    useSession.setState({ status: 'signedIn', user });
    ensureAccount(user);
    const e = elderActions.create({ firstName: 'Rosa', lastName: '', gender: 'female', birthDate: null, age: 80, weightKg: null, heightCm: null, relation: 'mother', relationOther: '' });
    elderActions.update(e.id, { setupDone: true, allergies: ['Penicilina'] });
  });

  it('agrega un medicamento solo con la dosis confirmada y revisa lo registrado', () => {
    const r = interpret('Ponle losartán de 50 mg a las 6 de la tarde todos los días');
    const action = r.actions[0];
    expect(execute(action).ok).toBe(false); // falta la dosis: no la inventa
    const res = execute({ ...action, doseAmount: 1, unitsPerPackage: 30 } as typeof action);
    expect(res.ok).toBe(true);
    expect(res.summary).toContain('No encontré coincidencias');
    const med = db.list('medications', user.id).find((m) => m.name === 'Losartán');
    expect(med?.schedule).toEqual({ kind: 'times', times: ['18:00'], days: [] });
    expect(med?.unitsOnHand).toBe(30);
  });

  it('avisa si coincide con una alergia escrita', () => {
    const a = interpret('Ponle una tableta de penicilina a las 8').actions[0];
    const res = execute(a);
    expect(res.summary).toContain('alergia registrada');
    expect(db.list('alerts', user.id).some((x) => x.kind === 'allergy_match')).toBe(true);
  });

  it('confirmar una toma descuenta existencias', () => {
    const med = db.list('medications', user.id).find((m) => m.name === 'Losartán')!;
    doseActions.sync(med.elderId!, new Date());
    const dose = db.list('doses', user.id).find((d) => d.medicationId === med.id)!;
    doseActions.confirm(dose.id, 'elder');
    expect(db.get('medications', med.id)?.unitsOnHand).toBe(29);
  });

  it('agua, contacto y deshacer', () => {
    const water = execute(interpret('Ponle 8 vasos de agua al día').actions[0]);
    expect(water.ok).toBe(true);
    expect(db.list('waterPlans', user.id)[0].glasses).toBe(8);
    const c = execute(interpret('Configúrale de emergencia a Juan, su hijo, 300 123 4567').actions[0]);
    expect(db.list('contacts', user.id).map((x) => x.name)).toContain('Juan');
    c.undo?.();
    expect(db.list('contacts', user.id).map((x) => x.name)).not.toContain('Juan');
  });

  it('las consultas responden solo con registros reales', () => {
    expect(answerQuery('sleep', null)).toBe('Aún no hay registros de hoy.');
    expect(answerQuery('stock', 'Losartán')).toContain('Losartán: 29 tabletas');
  });

  it('PIN de entrega: correcto desbloquea; 5 errores bloquean', async () => {
    const elderId = db.list('elders', user.id)[0].id;
    await handoffActions.setPin('1234');
    handoffActions.start(elderId);
    expect((await handoffActions.unlock('0000')).result).toBe('wrong');
    expect((await handoffActions.unlock('1234')).result).toBe('ok');
    expect(useDb.getState().handoff).toBeNull();
    handoffActions.start(elderId);
    for (let i = 0; i < 4; i++) await handoffActions.unlock('9999');
    expect((await handoffActions.unlock('9999')).result).toBe('locked');
  });
});
