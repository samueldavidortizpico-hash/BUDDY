import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import * as Speech from 'expo-speech';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { FEATURES } from '@/config/features';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ConfirmDialog, useToast } from '@/components/feedback';
import { Chip, Field, Segmented, Stepper, Toggle } from '@/components/forms';
import { Icon } from '@/components/icon';
import { IconTile } from '@/components/icon-tile';
import { BuddyRobot } from '@/components/robot';
import { PLAN_ORDER, PLANS, type PlanId } from '@/config/plans';
import { NurseAccessCard } from '@/features/plans/nurse-access';
import { PlanSettings } from '@/features/plans/plan-settings';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { AuthError } from '@/domain/auth';
import { escalationOf } from '@/domain/schedule';
import { DEFAULT_SILENCE_HOURS } from '@/domain/verification';
import { ALERT_KINDS, type ElderAppearance } from '@/domain/types';
import { DEFAULT_THRESHOLDS, type Thresholds as RecoThresholds } from '@/domain/recommendations/engine';
import { planActions, useEntitlementPlan } from '@/state/entitlements';
import { feedActions } from '@/state/feed';
import { isHiddenToday, useLauncherStore } from '@/state/launcher';
import { notificationPermission, sendTestNotification } from '@/infrastructure/notifications';
import { TimeField } from '@/components/time-picker';
import { db, useDb } from '@/infrastructure/local/db';
import { strings } from '@/i18n';
import { elderActions } from '@/state/actions';
import { disableDemo, enableDemo } from '@/state/demo';
import { useAccount, useActiveElder, useElders } from '@/state/data';
import { sessionActions, useSession } from '@/state/session';
import { radius, spacing, touch, type TextScale } from '@/theme';
import { makeStyles, useAppearanceStore, useTheme, type AppearanceMode } from '@/theme/provider';

const S = strings.settings;

export default function SettingsSection() {
  const { section } = useLocalSearchParams<{ section: string }>();
  const elder = useActiveElder();
  const titles: Record<string, string> = {
    account: S.sections.account,
    appearance: S.sections.appearance,
    elder: elder ? S.sections.elderScreen(elder.firstName) : '',
    alerts: S.sections.alerts,
    notifications: S.sections.notifications,
    people: S.sections.people,
    devices: S.sections.devices,
    legal: S.sections.legal,
    advanced: S.sections.advanced,
    about: S.sections.about,
    plan: S.sections.plan,
  };
  const View_ = { account: Account, appearance: Appearance, elder: ElderScreenPrefs, alerts: MyAlerts, notifications: NotificationsSection, people: People, devices: Devices, legal: Legal, advanced: Advanced, about: About, plan: PlanSettings }[section as 'account'] ?? About;
  return (
    <ScreenContainer keyboard header={<ScreenHeader title={titles[section] ?? S.title} fallback="/settings" />}>
      <View_ />
    </ScreenContainer>
  );
}

function Row({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  const t = useTheme();
  const s = useStyles();
  return (
    <View style={s.switchRow}>
      <View style={s.flex}>
        <AppText variant="secondaryStrong">{label}</AppText>
        {hint ? <AppText variant="caption" color={t.c.muted}>{hint}</AppText> : null}
      </View>
      <Toggle value={value} onChange={onChange} label={label} />
    </View>
  );
}

// ── Cuenta ───────────────────────────────────────────────────
function Account() {
  const router = useRouter();
  const toast = useToast();
  const t = useTheme();
  const s = useStyles();
  const user = useSession((x) => x.user);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [del, setDel] = useState(false);
  const [out, setOut] = useState(false);
  const [delPass, setDelPass] = useState('');
  const [delErr, setDelErr] = useState<string | null>(null);
  return (
    <View style={s.stack}>
      <Card style={s.stack}>
        <AppText variant="caption" color={t.c.muted}>{S.name}</AppText>
        <AppText variant="bodyStrong">{user?.name}</AppText>
        <AppText variant="caption" color={t.c.muted}>{S.email}</AppText>
        <AppText variant="bodyStrong">{user?.email}</AppText>
      </Card>
      <AppText variant="h3">{S.changePassword}</AppText>
      <Field label={S.current} value={current} onChangeText={setCurrent} secure autoCapitalize="none" />
      <Field label={S.newPassword} value={next} onChangeText={setNext} secure autoCapitalize="none" hint={strings.auth.passwordHint} error={err} />
      <Button
        label={S.changePassword}
        variant="ghost"
        size="md"
        onPress={async () => {
          try {
            await sessionActions.updatePassword(current, next);
            setCurrent('');
            setNext('');
            setErr(null);
            toast(S.passwordChanged);
          } catch (e) {
            setErr(e instanceof AuthError ? e.message : strings.auth.errors.unknown);
          }
        }}
      />
      <AppText variant="caption" color={t.c.muted}>{S.authNote}</AppText>
      <Button label="Código de recuperación" icon="lock" variant="ghost" size="md" onPress={() => router.push('/settings/recovery' as Href)} />
      <Button label="Ver la pantalla de mi persona" icon="eye" variant="ghost" size="md" onPress={() => router.push('/preview')} />
      <Button label={S.signOut} icon="logout" onPress={() => setOut(true)} />
      <ConfirmDialog visible={out} title={S.signOutTitle} body={S.signOutBody} confirmLabel={S.signOut} onCancel={() => setOut(false)}
        onConfirm={async () => { setOut(false); await sessionActions.signOut(); router.replace('/'); }}
      />
      <Button label={S.deleteAccount} icon="trash" variant="danger" size="md" onPress={() => setDel(true)} />
      <ConfirmDialog visible={del} title={S.deleteTitle} body={S.deleteBody} confirmLabel={S.deleteAccount} destructive onCancel={() => setDel(false)}
        onConfirm={async () => {
          try {
            await sessionActions.deleteAccount(delPass);
            setDel(false);
            toast(S.deleted);
            router.replace('/');
          } catch (e) {
            setDelErr(e instanceof AuthError ? e.message : strings.auth.errors.unknown);
          }
        }}
      />
      {del ? <Field label={S.deleteConfirm} value={delPass} onChangeText={setDelPass} secure error={delErr} /> : null}
    </View>
  );
}

// ── Apariencia ───────────────────────────────────────────────
function Appearance() {
  const t = useTheme();
  const s = useStyles();
  const mode = useAppearanceStore((x) => x.mode);
  const hc = useAppearanceStore((x) => x.highContrast);
  const scale = useAppearanceStore((x) => x.textScale);
  const barGestures = useAppearanceStore((x) => x.barGestures);
  const set = useAppearanceStore((x) => x.set);
  return (
    <View style={s.stack}>
      <Card variant="gradient" domain="activity" style={s.previewCard}>
        <IconTile icon="sun" domain="activity" size={64} />
        <View style={s.flex}>
          <AppText variant="h3" color={t.domains.activity.text}>{S.previewText}</AppText>
          <Button label={strings.welcome.createAccount} size="sm" />
        </View>
      </Card>
      <AppText variant="secondaryStrong">{S.mode}</AppText>
      <Segmented scroll label={S.mode} value={mode} onChange={(m: AppearanceMode) => set({ mode: m })} options={(['auto', 'light', 'dark'] as AppearanceMode[]).map((k) => ({ key: k, label: S.modes[k] }))} />
      <Row label={S.contrast} hint={S.contrastHint} value={hc} onChange={(v) => set({ highContrast: v })} />
      <AppText variant="secondaryStrong">{S.textSize}</AppText>
      <View style={s.wrap}>
        {(['normal', 'large', 'xlarge', 'huge', 'max'] as TextScale[]).map((k) => (
          <Chip key={k} label={S.sizes[k]} selected={scale === k} onPress={() => set({ textScale: k })} />
        ))}
      </View>
      <Row label={S.barGestures} hint={S.barGesturesHint} value={barGestures} onChange={(v) => set({ barGestures: v })} />
      <RobotPrefs />
    </View>
  );
}

/** El robot flotante: imán a los bordes, restablecer su posición y ocultarlo por hoy. */
function RobotPrefs() {
  const s = useStyles();
  const toast = useToast();
  const magnet = useLauncherStore((x) => x.magnet);
  const hidden = isHiddenToday(useLauncherStore((x) => x.hiddenOn));
  const L = useLauncherStore.getState();
  return (
    <View style={s.stack}>
      <AppText variant="h3">{S.robot}</AppText>
      <Row label={S.robotMagnet} hint={S.robotMagnetHint} value={magnet} onChange={(v) => L.setMagnet(v)} />
      <Button label={S.robotReset} icon="arrow" variant="ghost" onPress={() => { L.reset(); toast({ message: S.robotResetDone, icon: 'check' }); }} />
      <Button label={hidden ? S.robotShow : S.robotHide} icon={hidden ? 'eye' : 'eyeOff'} variant="ghost" onPress={() => (hidden ? L.show() : L.hideToday())} />
    </View>
  );
}

// ── Pantalla del adulto mayor ───────────────────────────────
function ElderScreenPrefs() {
  const s = useStyles();
  const elder = useActiveElder();
  if (!elder) return null;
  const p = elder.screen;
  const upd = (patch: Partial<typeof p>) => elderActions.update(elder.id, { screen: { ...p, ...patch } });
  return (
    <View style={s.stack}>
      <AppText variant="secondaryStrong">{S.textSize}</AppText>
      <View style={s.wrap}>
        {(['normal', 'large', 'xlarge', 'huge'] as TextScale[]).map((k) => (
          <Chip key={k} label={S.sizes[k]} selected={p.textScale === k} onPress={() => upd({ textScale: k })} />
        ))}
      </View>
      <AppText variant="secondaryStrong">{S.sections.appearance}</AppText>
      <View style={s.wrap}>
        {(['auto', 'light', 'dark', 'contrast'] as ElderAppearance[]).map((k) => (
          <Chip key={k} label={S.elderAppearance[k]} selected={p.appearance === k} onPress={() => upd({ appearance: k })} />
        ))}
      </View>
      <Row label={S.voice} value={p.voice} onChange={(voice) => upd({ voice })} />
      <Segmented label={S.voiceRate} value={p.voiceRate < 0.85 ? 'slow' : 'normal'} onChange={(v) => upd({ voiceRate: v === 'slow' ? 0.75 : 0.95 })} options={[{ key: 'slow', label: S.slow }, { key: 'normal', label: S.normalRate }]} />
      <Button label={S.testVoice} icon="play" variant="ghost" size="md" onPress={() => Speech.speak(S.voiceSample(elder.firstName), { language: 'es-CO', rate: p.voiceRate })} />
      <Stepper label={S.maxSnoozes} value={p.maxSnoozes} min={0} max={5} onChange={(maxSnoozes) => upd({ maxSnoozes })} />
    </View>
  );
}

// ── Mis avisos ───────────────────────────────────────────────
function MyAlerts() {
  const s = useStyles();
  const account = useAccount();
  if (!account) return null;
  return (
    <View style={s.stack}>
      {ALERT_KINDS.map((k) => (
        <Row key={k} label={strings.alertKinds[k]} value={account.myAlerts[k]} onChange={(v) => db.update('accounts', account.id, { myAlerts: { ...account.myAlerts, [k]: v } })} />
      ))}
      <EscalationPrefs />
      <Thresholds />
    </View>
  );
}

/** Aviso escalonado de cada toma (V3.0): segundo aviso y "sin confirmar", en minutos desde la hora. */
function EscalationPrefs() {
  const t = useTheme();
  const s = useStyles();
  const elder = useActiveElder();
  if (!elder) return null;
  const E = S.escalation;
  const e = escalationOf(elder.screen);
  const set = (patch: Partial<typeof e>) => elderActions.update(elder.id, { screen: { ...elder.screen, ...escalationOf({ ...e, ...patch }) } });
  const min = (n: number) => E.minutes(n);
  return (
    <Card style={s.stack}>
      <AppText variant="h3">{E.title}</AppText>
      <AppText variant="secondary" color={t.c.muted}>{E.body(elder.firstName)}</AppText>
      <Stepper label={E.remind} value={e.remindAfterMin} min={5} max={e.unconfirmedAfterMin - 5} step={5} onChange={(v) => set({ remindAfterMin: v })} format={min} />
      <Stepper label={E.unconfirmed} value={e.unconfirmedAfterMin} min={e.remindAfterMin + 5} max={120} step={5} onChange={(v) => set({ unconfirmedAfterMin: v })} format={min} />
      <AppText variant="caption" color={t.c.muted}>{E.note}</AppText>
      <Stepper
        label={E.silence(elder.firstName)}
        value={elder.screen.silenceHours ?? DEFAULT_SILENCE_HOURS}
        min={4}
        max={48}
        step={2}
        onChange={(v) => elderActions.update(elder.id, { screen: { ...elder.screen, silenceHours: v } })}
        format={E.hours}
      />
      <AppText variant="caption" color={t.c.muted}>{E.silenceNote}</AppText>
      <TimeField label={E.summaryTime} value={elder.summaryTime ?? '20:00'} onChange={(v) => elderActions.update(elder.id, { summaryTime: v })} />
      <AppText variant="caption" color={t.c.muted}>{E.summaryNote}</AppText>
    </Card>
  );
}

/** Umbrales del motor de recomendaciones, por persona. Los define el cuidador o el médico; BUDDY no diagnostica. */
function Thresholds() {
  const t = useTheme();
  const s = useStyles();
  const elder = useActiveElder();
  const userId = useSession((x) => x.user?.id ?? '');
  const saved = useDb((x) => (elder ? (x.drafts[userId]?.[`reco.thresholds.${elder.id}`] as RecoThresholds | undefined) : undefined));
  if (!elder) return null;
  const th = saved ?? DEFAULT_THRESHOLDS;
  const F = strings.feed;
  const set = (patch: Partial<RecoThresholds>) => feedActions.setThresholds(elder.id, { ...th, ...patch });
  const days = (n: number) => strings.meds.daysUnit(n);
  return (
    <Card style={s.stack}>
      <AppText variant="h3">{F.thresholds}</AppText>
      <AppText variant="caption" color={t.c.muted}>{F.thresholdsNote}</AppText>
      <AppText variant="secondaryStrong">{F.moodDays}</AppText>
      <Stepper label={F.severity.attention} value={th.moodDays[0]} min={1} max={th.moodDays[1]} onChange={(v) => set({ moodDays: [v, th.moodDays[1], th.moodDays[2]] })} format={days} />
      <Stepper label={F.severity.attention} value={th.moodDays[1]} min={th.moodDays[0]} max={th.moodDays[2]} onChange={(v) => set({ moodDays: [th.moodDays[0], v, th.moodDays[2]] })} format={days} />
      <Stepper label={F.severity.alarm} value={th.moodDays[2]} min={th.moodDays[1]} max={60} onChange={(v) => set({ moodDays: [th.moodDays[0], th.moodDays[1], v] })} format={days} />
      <AppText variant="secondaryStrong">{F.sleepDays}</AppText>
      <Stepper label={F.severity.attention} value={th.sleepDays[0]} min={1} max={th.sleepDays[1]} onChange={(v) => set({ sleepDays: [v, th.sleepDays[1], th.sleepDays[2]] })} format={days} />
      <Stepper label={F.severity.alarm} value={th.sleepDays[1]} min={th.sleepDays[0]} max={th.sleepDays[2]} onChange={(v) => set({ sleepDays: [th.sleepDays[0], v, th.sleepDays[2]] })} format={days} />
      <Stepper label={F.thresholds} value={th.sleepDays[2]} min={th.sleepDays[1]} max={60} onChange={(v) => set({ sleepDays: [th.sleepDays[0], th.sleepDays[1], v] })} format={days} />
      <Stepper label={F.adherence} value={Math.round(th.adherence * 100)} min={50} max={100} step={5} onChange={(v) => set({ adherence: v / 100 })} format={(v) => `${v} %`} />
      <Stepper label={F.waterDays} value={th.waterDays} min={1} max={7} onChange={(v) => set({ waterDays: v })} format={days} />
      <Stepper label={F.checkinDays} value={th.checkinDays} min={1} max={7} onChange={(v) => set({ checkinDays: v })} format={days} />
    </Card>
  );
}

// ── Notificaciones ───────────────────────────────────────────
function NotificationsSection() {
  const t = useTheme();
  const s = useStyles();
  const toast = useToast();
  const elder = useActiveElder();
  const N = strings.notifications;
  const [state, setState] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    notificationPermission(false).then((st) => alive && setState(st)).catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  if (!elder) return null;
  const prefs = elder.screen;
  return (
    <View style={s.stack}>
      <AppText variant="secondary" color={t.c.muted}>{N.body(elder.firstName)}</AppText>
      {state ? <AppText variant="secondaryStrong">{N.status[state]}</AppText> : null}
      <Button
        label={N.test(elder.firstName)}
        icon="bell"
        variant="tonal"
        tone="mint"
        onPress={async () => {
          const st = await sendTestNotification(elder.firstName);
          setState(st);
          toast({ message: st === 'granted' ? N.testSent : N.status[st], icon: st === 'granted' ? 'check' : 'info' });
        }}
      />
      <TimeField label={N.apptTime} value={prefs.apptNoticeTime ?? '18:00'} onChange={(v) => elderActions.update(elder.id, { screen: { ...prefs, apptNoticeTime: v } })} />
      <Row label={N.showMedName} hint={N.showMedNameHint} value={!!prefs.showMedName} onChange={(v) => elderActions.update(elder.id, { screen: { ...prefs, showMedName: v } })} />
      <AppText variant="caption" color={t.c.muted}>{N.honest}</AppText>
    </View>
  );
}

// ── Mis personas ─────────────────────────────────────────────
function People() {
  const router = useRouter();
  const t = useTheme();
  const s = useStyles();
  const elders = useElders();
  const active = useActiveElder();
  return (
    <View style={s.stack}>
      {elders.map((e) => (
        // Nombre arriba y acciones debajo (con salto de línea): en una sola fila los botones aplastaban el nombre a
        // una letra por línea y "Acceso" se salía de la pantalla (V3.0, docs/AUDITORIA_V3_0.md).
        <Card key={e.id} style={s.stack}>
          <View style={s.personHead}>
            <Icon name="user" color={t.ink.lavender} />
            <View style={s.flex}>
              <AppText variant="bodyStrong">{`${e.firstName} ${e.lastName}`.trim()}</AppText>
              {e.id === active?.id || !e.setupDone ? <AppText variant="caption" color={t.c.muted}>{e.id === active?.id ? S.active : strings.summary.resume}</AppText> : null}
            </View>
          </View>
          <View style={s.wrapRow}>
            {e.id !== active?.id ? <Button label={S.makeActive} size="sm" variant="ghost" onPress={() => elderActions.setActive(e.id)} /> : null}
            <Button label={strings.common.edit} size="sm" variant="ghost" onPress={() => router.push({ pathname: '/setup', params: { elderId: e.id } })} />
            {e.setupDone ? <Button label={strings.setup.access.manage} icon="lock" size="sm" variant="ghost" onPress={() => router.push({ pathname: '/settings/access/[elderId]', params: { elderId: e.id } } as unknown as Href)} /> : null}
          </View>
        </Card>
      ))}
      <Button label={S.addPerson} icon="plus" variant="tonal" tone="mint" onPress={() => router.push({ pathname: '/setup', params: { new: '1' } })} />
      {active?.setupDone ? <Button label={strings.invite.button} icon="users" variant="tonal" tone="mint" onPress={() => router.push('/settings/invite' as Href)} /> : null}
      {active?.setupDone ? <NurseAccessCard elder={active} /> : null}
    </View>
  );
}

// ── Dispositivos ─────────────────────────────────────────────
function Devices() {
  const router = useRouter();
  const t = useTheme();
  const s = useStyles();
  return (
    <View style={s.stack}>
      <Card style={s.personRow}>
        <Icon name="phone" color={t.ink.mint} />
        <AppText variant="bodyStrong" style={s.flex}>{S.thisDevice}</AppText>
      </Card>
      <AppText variant="secondary" color={t.c.muted}>{S.devicesBody}</AppText>
      {FEATURES.watch ? <Button label={strings.health.watch} icon="watch" variant="ghost" size="md" onPress={() => router.push('/health/watch' as Href)} /> : <AppText variant="caption" color={t.c.muted}>{S.watchSoon}</AppText>}
    </View>
  );
}

// ── Legal y permisos ─────────────────────────────────────────
function Legal() {
  const router = useRouter();
  const toast = useToast();
  const t = useTheme();
  const s = useStyles();
  const account = useAccount();
  const userId = useSession((x) => x.user?.id);
  const db_ = useDb();
  const [wipe, setWipe] = useState(false);
  if (!account || !userId) return null;
  const perm = (k: keyof typeof account.permissions, v: boolean) => db.update('accounts', account.id, { permissions: { ...account.permissions, [k]: v } });
  return (
    <View style={s.stack}>
      <Button label={strings.legal.terms.title} variant="ghost" size="md" onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'terms' } })} />
      <Button label={strings.legal.privacy.title} variant="ghost" size="md" onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'privacy' } })} />
      <Button label={strings.legal.sources.title} variant="ghost" size="md" onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'sources' } })} />
      <AppText variant="h3">{S.permissions}</AppText>
      <Row label={S.camera} value={account.permissions.camera} onChange={(v) => perm('camera', v)} />
      <Row label={S.notifications} hint={S.notificationsSoon} value={account.permissions.notifications} onChange={(v) => perm('notifications', v)} />
      <Row label={S.healthPerm} hint={strings.health.watchExpoGo} value={account.permissions.health} onChange={(v) => perm('health', v)} />
      <Button
        label={S.export}
        icon="download"
        variant="tonal"
        tone="sky"
        onPress={async () => {
          const mine = Object.fromEntries(
            Object.entries(db_).filter(([, v]) => v && typeof v === 'object' && !Array.isArray(v)).map(([k, v]) => [k, Object.values(v as Record<string, { ownerUserId?: string }>).filter((r) => r?.ownerUserId === userId)]),
          );
          await Clipboard.setStringAsync(JSON.stringify(mine, null, 2));
          toast(S.exported);
        }}
      />
      <AppText variant="caption" color={t.c.muted}>{S.exportBody}</AppText>
      <Button label={S.deleteData} icon="trash" variant="danger" size="md" onPress={() => setWipe(true)} />
      <ConfirmDialog visible={wipe} title={`${S.deleteData}?`} body={S.deleteDataBody} confirmLabel={strings.common.delete} destructive onCancel={() => setWipe(false)}
        onConfirm={() => {
          const acc = { ...account };
          db.purgeUser(userId);
          db.putMany('accounts', [{ ...acc, activeElderId: null }]);
          setWipe(false);
          router.replace('/setup');
        }}
      />
    </View>
  );
}

// ── Avanzado ─────────────────────────────────────────────────
function Advanced() {
  const router = useRouter();
  const toast = useToast();
  const t = useTheme();
  const s = useStyles();
  const account = useAccount();
  const userId = useSession((x) => x.user?.id);
  const plan = useEntitlementPlan();
  const [reset, setReset] = useState(false);
  if (!account || !userId) return null;
  return (
    <View style={s.stack}>
      {FEATURES.devTools ? (
        <View style={s.stack}>
          <AppText variant="secondaryStrong">{strings.plus.testPlanLabel}</AppText>
          <Segmented label={strings.plus.testPlanLabel} value={plan} onChange={(p: PlanId) => planActions.setTestPlan(p, userId)} options={PLAN_ORDER.map((p) => ({ key: p, label: PLANS[p].name }))} />
          <AppText variant="caption" color={t.c.muted}>{strings.plus.testPlanHint}</AppText>
        </View>
      ) : null}
      <Row
        label={S.demo}
        hint={S.demoBody}
        value={account.demoMode}
        onChange={(v) => {
          db.update('accounts', account.id, { demoMode: v });
          if (v) {
            enableDemo();
            toast(S.demoLoaded);
          } else disableDemo();
        }}
      />
      <Button label={S.reset} icon="trash" variant="danger" size="md" onPress={() => setReset(true)} />
      <AppText variant="caption" color={t.c.muted}>{S.deleteDataBody}</AppText>
      <ConfirmDialog visible={reset} title={S.resetTitle} body={S.deleteDataBody} confirmLabel={S.reset} destructive onCancel={() => setReset(false)}
        onConfirm={() => {
          const acc = { ...account };
          db.purgeUser(userId);
          db.putMany('accounts', [{ ...acc, activeElderId: null, demoMode: false }]);
          setReset(false);
          router.replace('/setup');
        }}
      />
    </View>
  );
}

// ── Acerca de ────────────────────────────────────────────────
function About() {
  const t = useTheme();
  const s = useStyles();
  const router = useRouter();
  const setAppearance = useAppearanceStore((x) => x.set);
  return (
    <View style={s.stack}>
      <View style={s.center}>
        <BuddyRobot size={96} shape="square" />
        <AppText variant="h2">{strings.brand.name}</AppText>
        <AppText variant="secondary" color={t.c.muted}>{S.version(Constants.expoConfig?.version ?? '1.0.0')}</AppText>
      </View>
      <Button
        label={S.replayIntro}
        variant="secondary"
        icon="sparkle"
        onPress={() => {
          setAppearance({ introSeen: false });
          router.push('/onboarding');
        }}
      />
      <Card style={s.stack}>
        <AppText variant="h3">{S.howAssistant}</AppText>
        <AppText variant="secondary">{S.howAssistantBody}</AppText>
      </Card>
      <Card style={s.stack}>
        <AppText variant="h3">{strings.legal.sources.title}</AppText>
        {strings.legal.sources.body.slice(0, 3).map((p) => (
          <AppText key={p} variant="caption" color={t.c.muted}>{p}</AppText>
        ))}
      </Card>
      <Card style={s.stack}>
        <AppText variant="h3">{S.support}</AppText>
        <AppText variant="secondary">{S.supportBody}</AppText>
      </Card>
      <Pressable accessibilityRole="text">
        <AppText variant="caption" color={t.c.muted} align="center">{strings.brand.tagline}</AppText>
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    flex: { flex: 1 },
    stack: { gap: spacing.md },
    wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    center: { alignItems: 'center', gap: spacing.xs },
    previewCard: { alignItems: 'flex-start', gap: spacing.sm },
    personRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
    personHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: touch.timeRow, padding: spacing.md, borderRadius: radius.input, backgroundColor: t.c.surface, ...t.hairline },
  }),
);
