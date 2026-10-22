import { createLocalAuthProvider } from '@/infrastructure/local/auth';

it('switches only to an owned elder and returns only with the owner password', async () => {
  const auth = createLocalAuthProvider();
  const owner = await auth.signUp({ name: '[PRUEBA] Admin', email: 'switch-v31@example.test', password: 'Segura123!' });
  await auth.createManagedAccount({ ownerId: owner.id, elderId: 'switch-elder', name: '[PRUEBA] Rosa', email: 'elder-switch-v31@example.test', password: 'Codigo123!' });
  expect(auth.switchToManaged).toBeDefined();
  await expect(auth.switchToManaged!('switch-elder', 'incorrecta')).rejects.toMatchObject({ code: 'invalid_credentials' });
  expect((await auth.getSession())?.id).toBe(owner.id);
  expect((await auth.switchToManaged!('switch-elder', 'Codigo123!')).role).toBe('elder');
  await expect(auth.returnToOwner!('incorrecta')).rejects.toMatchObject({ code: 'invalid_credentials' });
  expect((await auth.getSession())?.role).toBe('elder');
  expect((await auth.returnToOwner!('Segura123!')).id).toBe(owner.id);
  await auth.signOut();
  expect(await auth.getSession()).toBeNull();
});

it('locks recovery after five invalid attempts and never accepts the password as a recovery code', async () => {
  const auth = createLocalAuthProvider();
  const email = 'locked-recovery-v31@example.test';
  await auth.signUp({ name: '[PRUEBA] Admin', email, password: 'Segura123!' });
  const code = await auth.regenerateRecoveryCode!('Segura123!');
  await auth.signOut();
  for (let i = 0; i < 4; i++) await expect(auth.recoverWithCode!({ email, code: 'Segura123!', next: 'Nueva123!' })).rejects.toMatchObject({ code: 'invalid_credentials' });
  await expect(auth.recoverWithCode!({ email, code: 'incorrecto', next: 'Nueva123!' })).rejects.toMatchObject({ code: 'locked', retryAfterMs: expect.any(Number) });
  await expect(auth.recoverWithCode!({ email, code, next: 'Nueva123!' })).rejects.toMatchObject({ code: 'locked' });
});

it('cannot switch to someone else’s managed account or return as an unrelated administrator', async () => {
  const auth = createLocalAuthProvider();
  const a = await auth.signUp({ name: '[PRUEBA] A', email: 'owner-a-v31@example.test', password: 'Segura123!' });
  await auth.createManagedAccount({ ownerId: a.id, elderId: 'owned-by-a', name: '[PRUEBA] Rosa', email: 'owned-a-v31@example.test', password: 'Codigo123!' });
  const b = await auth.signUp({ name: '[PRUEBA] B', email: 'owner-b-v31@example.test', password: 'Segura123!' });
  await expect(auth.switchToManaged!('owned-by-a', 'Codigo123!')).rejects.toMatchObject({ code: 'invalid_credentials' });
  expect((await auth.getSession())?.id).toBe(b.id);
  await auth.signIn({ email: 'owner-a-v31@example.test', password: 'Segura123!' });
  await auth.switchToManaged!('owned-by-a', 'Codigo123!');
  await expect(auth.returnToOwner!('Segura123!', 'owner-b-v31@example.test')).rejects.toMatchObject({ code: 'forbidden' });
  expect((await auth.getSession())?.role).toBe('elder');
});

it('rotates recovery codes and consumes a valid code without exposing a password', async () => {
  const auth = createLocalAuthProvider();
  const email = 'recovery-v31@example.test';
  await auth.signUp({ name: '[PRUEBA] Admin', email, password: 'Segura123!' });
  expect(auth.regenerateRecoveryCode).toBeDefined();
  const old = await auth.regenerateRecoveryCode!('Segura123!');
  const code = await auth.regenerateRecoveryCode!('Segura123!');
  expect(code).not.toBe(old);
  await auth.signOut();
  await expect(auth.recoverWithCode!({ email, code: old, next: 'Nueva123!' })).rejects.toMatchObject({ code: 'invalid_credentials' });
  await auth.recoverWithCode!({ email, code, next: 'Nueva123!' });
  await expect(auth.recoverWithCode!({ email, code, next: 'Otra123!' })).rejects.toMatchObject({ code: 'invalid_credentials' });
  await expect(auth.signIn({ email, password: 'Segura123!' })).rejects.toMatchObject({ code: 'invalid_credentials' });
  expect((await auth.signIn({ email, password: 'Nueva123!' })).role).toBe('caregiver');
});
