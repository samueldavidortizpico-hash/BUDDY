/**
 * Pasos 3 y 4 (v2.2): ChangeLog, subscribe(), SyncEngine desactivado con reglas de conflicto, y la pantalla
 * "Entregar a [nombre]" (vista previa en vivo, probar como, entregar). Datos ficticios de prueba.
 */
import { Stack } from 'expo-router';
import { act, cleanup, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';

import Handoff from '@/app/(caregiver)/handoff';
import Preview from '@/app/(caregiver)/preview';
import CaregiverLayout from '@/app/(caregiver)/_layout';
import ElderHome from '@/app/elder';
import ElderLayout from '@/app/elder/_layout';
import type { SyncMeta } from '@/domain/types';
import { db, useDb } from '@/infrastructure/local/db';
import { createSyncEngine, resolveConflict, acceptsChange } from '@/infrastructure/sync/engine';
import { strings } from '@/i18n';
import { routineActions } from '@/state/actions';
import { handoffActions } from '@/state/handoff';
import { useSession } from '@/state/session';
import { RenderProviders, seedRenderData, testUser } from '@/testing/render-fixtures';
import { toISODate } from '@/utils/dates';

let elderId: string;
beforeEach(async () => {
  elderId = (await seedRenderData()).id;
});
afterEach(() => cleanup());

describe('ChangeLog y subscribe()', () => {
  it('cada escritura deja entrada con entidad, operación, autor, fecha y versión', () => {
    useDb.setState({ changelog: [] });
    const r = routineActions.addReminder('Llamar a Juan', '10:00', [], elderId);
    db.update('reminders', r.id, { time: '11:00' });
    db.remove('reminders', r.id);
    db.restore('reminders', r.id);
    const log = useDb.getState().changelog.filter((c) => c.entityId === r.id);
    expect(log.map((c) => c.op)).toEqual(['insert', 'update', 'delete', 'restore']);
    expect(log.map((c) => c.version)).toEqual([1, 2, 3, 4]);
    expect(log.every((c) => c.entity === 'reminders' && c.author === testUser.id && c.syncStatus === 'pending')).toBe(true);
    expect(db.get('reminders', r.id)).toMatchObject({ version: 4, syncStatus: 'pending' });
    expect(db.pendingChanges(testUser.id).length).toBeGreaterThanOrEqual(4);
    // Sin datos de salud en el registro de cambios: solo ids.
    expect(JSON.stringify(log)).not.toContain('Llamar a Juan');
  });

  it('el autor es el adulto mayor cuando responde con su propio acceso', () => {
    useSession.setState({ status: 'signedIn', user: { id: 'elder-acc', email: 'e@x.co', name: 'Rosa', createdAt: '', role: 'elder', ownerId: testUser.id, elderId } });
    const w = db.insert('water', { date: toISODate(new Date()), at: new Date().toISOString() }, { userId: testUser.id, elderId, by: 'elder-acc' });
    expect(useDb.getState().changelog.at(-1)).toMatchObject({ entity: 'water', entityId: w.id, author: 'elder-acc', ownerUserId: testUser.id });
  });

  it('subscribe() avisa al instante solo cuando cambia esa colección', () => {
    const onMeds = jest.fn();
    const off = db.subscribe('medications', onMeds);
    routineActions.addReminder('Otra cosa', '09:00', [], elderId);
    expect(onMeds).not.toHaveBeenCalled();
    db.insert('medications', { name: 'Prueba', activeIngredient: '', strength: '', form: 'tablet', doseAmount: 1, doseUnit: 'unit', schedule: { kind: 'times', times: ['08:00'], days: [] }, startDate: toISODate(new Date()), endDate: null, instructions: '', purpose: '', description: '', unitsPerPackage: null, unitsOnHand: null, refillAlertDays: 7, photoUri: null, paused: false }, { userId: testUser.id, elderId });
    expect(onMeds).toHaveBeenCalledTimes(1);
    off();
  });
});

describe('SyncEngine (desactivado) y reglas de conflicto', () => {
  const rec = (over: Partial<SyncMeta>): SyncMeta => ({ id: 'x', ownerUserId: 'admin', elderId: 'e', createdBy: 'admin', createdAt: '', updatedAt: '2026-10-11T10:00:00Z', deletedAt: null, syncStatus: 'synced', version: 1, ...over });
  const roleOf = (id: string) => (id === 'elder-acc' ? 'elder' : 'caregiver') as 'elder' | 'caregiver';

  it('el administrador manda sobre la rutina aunque la versión del adulto mayor sea más nueva', () => {
    expect(resolveConflict('medications', rec({ createdBy: 'admin', version: 2 }), rec({ createdBy: 'elder-acc', version: 9, updatedAt: '2026-10-12T00:00:00Z' }), roleOf)).toBe('local');
    expect(resolveConflict('medications', rec({ createdBy: 'elder-acc', version: 9 }), rec({ createdBy: 'admin', version: 1 }), roleOf)).toBe('remote');
  });

  it('en eventos gana la versión más alta y, a igual versión, el más reciente', () => {
    expect(resolveConflict('doses', rec({ version: 2 }), rec({ version: 3 }), roleOf)).toBe('remote');
    expect(resolveConflict('water', rec({ version: 2, updatedAt: '2026-10-11T11:00:00Z' }), rec({ version: 2 }), roleOf)).toBe('local');
  });

  it('el adulto mayor solo agrega eventos', () => {
    expect(acceptsChange('checkins', 'elder')).toBe(true);
    expect(acceptsChange('medications', 'elder')).toBe(false);
    expect(acceptsChange('medications', 'caregiver')).toBe(true);
  });

  it('desactivado no envía nada y lo dice; un fallo del transporte nunca es silencioso', async () => {
    const input = { pending: [], records: {}, since: '', apply: jest.fn() };
    expect(await createSyncEngine().run(input)).toMatchObject({ status: 'disabled' });
    const failing = createSyncEngine({ enabled: true, transport: { push: async () => { throw new Error('Sin red'); }, pull: async () => [] } });
    expect(await failing.run(input)).toEqual({ status: 'error', message: 'Sin red' });
  });
});

describe('Entregar a [nombre]', () => {
  function TestRoot() {
    return <RenderProviders><Stack screenOptions={{ headerShown: false }} /></RenderProviders>;
  }
  const routes = {
    _layout: TestRoot,
    '(caregiver)/_layout': CaregiverLayout,
    '(caregiver)/handoff': Handoff,
    '(caregiver)/preview': Preview,
    '(caregiver)/summary': () => <Text>Resumen de prueba</Text>,
    'elder/_layout': ElderLayout,
    'elder/index': ElderHome,
  };

  it('tiene flecha atrás y tres opciones claras', async () => {
    await renderRouter(routes, { initialUrl: '/handoff' });
    expect(screen.getByRole('button', { name: strings.common.back })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Vista de Rosa' })).toBeTruthy();
    expect(screen.getByRole('button', { name: strings.handoff.testAction('Rosa') })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cambiar a la cuenta de Rosa' })).toBeTruthy();
  });

  it('la vista previa en vivo se actualiza al instante cuando el administrador agrega algo', async () => {
    await renderRouter(routes, { initialUrl: '/preview' });
    expect(screen.queryByText(/Mensaje de prueba/)).toBeNull();
    await act(() => {
      const d = new Date();
      const hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      routineActions.addReminder('Mensaje de prueba', hhmm, [], elderId, toISODate(d));
    });
    expect(await screen.findByText('Mensaje de prueba')).toBeTruthy();
  });

  it('"Probar como" abre la pantalla real con "Modo prueba" y se sale sin PIN', async () => {
    const r = await renderRouter(routes, { initialUrl: '/handoff' });
    await fireEvent.press(screen.getByRole('button', { name: strings.handoff.testAction('Rosa') }));
    await waitFor(() => expect(r.getPathname()).toBe('/elder'));
    expect(screen.getByText(strings.handoff.testBanner)).toBeTruthy();
    expect(handoffActions.hasPin()).toBe(false);
    await fireEvent.press(screen.getByRole('button', { name: strings.handoff.testExit }));
    await waitFor(() => expect(r.getPathname()).toBe('/handoff'));
    expect(db.draftHandoff()).toBeNull();
  });

  it('una entrega real no se puede cerrar como si fuera prueba', async () => {
    await handoffActions.setPin('1234');
    handoffActions.start(elderId);
    expect(handoffActions.exitTest()).toBe(false);
    expect(db.draftHandoff()).toMatchObject({ mode: 'locked' });
  });

  it('sin nada programado muestra el estado vacío del paciente, sin datos inventados', async () => {
    await renderRouter(routes, { initialUrl: '/preview' });
    expect(screen.getByText(strings.elder.done)).toBeTruthy();
  });
});
