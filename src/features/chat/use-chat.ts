/**
 * Hook del chat de BUDDY: une el intérprete, el borrador persistente y el ejecutor.
 * - Cada petición que cambia datos crea un borrador. La pregunta, las respuestas rápidas y la confirmación viven en la
 *   TARJETA FIJA sobre el compositor (V2.4): responder no agrega burbujas al historial y nada queda enterrado arriba.
 * - Al confirmar ejecuta por el mismo camino que Rutina y deja una sola línea "✓ … · Ver · Deshacer".
 * - Si no entiende, o le preguntan qué sabe hacer, responde con el menú de acciones.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { menuTemplate, type Draft, type MenuKey } from '@/domain/assistant/draft';
import { ingredientsText, strengthText, type ProductMatch } from '@/domain/knowledge';
import { enrichMedication } from '@/features/chat/knowledge';
import type { MedInfoPayload } from '@/features/chat/med-info';
import { medicationKnowledge } from '@/infrastructure/knowledge';
import { EXAMPLES } from '@/domain/assistant/engine';
import type { FieldKey } from '@/domain/assistant/types';
import { normalizeText } from '@/domain/validation';
import { db, useDb } from '@/infrastructure/local/db';
import { strings } from '@/i18n';
import { SUGGESTIONS, answerQuery, context, conversation, draftActions, interpret, isDraftable, type ExecResult, type RoutineSegment } from '@/state/assistant';
import { useActiveElder, useUserId } from '@/state/data';
import { computeFeed } from '@/state/feed';
import { successHaptic } from '@/utils/haptics';

const B = strings.buddy;
const K = strings.knowledge;

/** Mensaje con la tarjeta de información verificada de un producto del registro. */
function medInfoMessage(m: ProductMatch, by: 'brand' | 'ingredient') {
  const payload: MedInfoPayload = {
    kind: 'medinfo',
    name: m.name,
    what: by === 'brand' ? `${ingredientsText(m).toLowerCase()} (${strengthText(m)})` : ingredientsText(m).toLowerCase(),
    atc: m.atc,
    ingredients: m.ingredients.map((i) => i.name),
    registry: { id: m.source.id, date: m.source.date },
  };
  conversation.add('buddy', m.name, { proposal: JSON.stringify(payload), proposalState: null });
}
/** Pausa breve y honesta: se muestra que BUDDY responde (no simula un análisis). */
export const REPLY_MS = 350;

export type ChatMood = 'idle' | 'think' | 'talk' | 'celebrate';

export interface ChatHandlers {
  openScan: () => void;
  openRoutine: (segment: RoutineSegment) => void;
  openPreview: () => void;
  openFeed: () => void;
  call: (phone: string) => void;
  /** Teléfono del contacto principal (para urgencias). */
  primary?: { name: string; phone: string };
}

/** Tipos de tarjeta especial dentro de un mensaje de BUDDY (campo `proposal`). */
export const MENU = 'menu';
export const DONE = 'done';

export function useDraft(): Draft | null {
  const userId = useUserId();
  const elder = useActiveElder();
  return useDb((s) => (userId && elder ? ((s.drafts[userId]?.[draftActions.key(elder.id)] as Draft | undefined) ?? null) : null));
}

export function useBuddyChat(h: ChatHandlers) {
  const draft = useDraft();
  const elder = useActiveElder();
  const userId = useUserId();
  const [typing, setTyping] = useState(false);
  const [mood, setMood] = useState<ChatMood>('idle');
  /** Aviso dentro de la tarjeta cuando una respuesta escrita no se entendió ("No entendí ese dato"). */
  const [hint, setHint] = useState<string | null>(null);
  /** Lo siguiente que se escriba es el nombre del medicamento a consultar. */
  const awaitingMed = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));

  const reply = useCallback((msg: string, extra: Parameters<typeof conversation.add>[2] = {}) => {
    setTyping(true);
    setMood('think');
    later(() => {
      conversation.add('buddy', msg, extra);
      setTyping(false);
      setMood('talk');
      later(() => setMood('idle'), 1400);
    }, REPLY_MS);
  }, []);

  const showMenu = useCallback((text: string, quickReplies: string[] = []) => reply(text, { proposal: JSON.stringify({ kind: MENU }), proposalState: null, quickReplies }), [reply]);

  const startDraft = useCallback(
    (actions: Parameters<typeof draftActions.start>[0]) => {
      setHint(null);
      // Medicamentos: se buscan en el registro del INVIMA para elegir la presentación (nunca se elige sola).
      let note: string = B.taskStarted;
      const enriched = actions.map((a) => {
        if (a.type !== 'add_medication') return a;
        const r = enrichMedication(a);
        if (r.notFound) note = K.notInRegistry(a.name);
        else if (r.matches.length) note = K.matchesIntro(a.name);
        return r.action;
      });
      draftActions.start(enriched);
      reply(note);
    },
    [reply],
  );

  /** Respuesta a la tarjeta (botón o texto): completa el borrador sin agregar burbujas. */
  const answer = useCallback((value: string) => {
    const current = draftActions.get();
    if (!current?.asking) return;
    const { index, field } = current.asking;
    const a = current.actions[index];
    // "¿Quisiste decir…?": el cuidador eligió un nombre del registro; se busca de nuevo con ese nombre.
    if (field === 'product' && a.type === 'add_medication' && a.suggestions?.includes(value)) {
      const r = enrichMedication({ ...a, name: value, suggestions: undefined });
      draftActions.replace(index, r.action);
      setHint(null);
      if (r.notFound) conversation.add('buddy', K.notInRegistry(value));
      return;
    }
    const before = JSON.stringify(a);
    const next = draftActions.answer(value);
    const unchanged = next?.asking?.index === index && next.asking.field === field && JSON.stringify(next.actions[index]) === before;
    setHint(unchanged ? B.notThatData : null);
    // Nombre escrito en la tarjeta (flujo del menú): se busca en el registro igual que al pedirlo por chat.
    const named = next?.actions[index];
    if (field === 'name' && named?.type === 'add_medication' && named.name) {
      const r = enrichMedication(named);
      if (r.action !== named) draftActions.replace(index, r.action);
      if (r.notFound) conversation.add('buddy', K.notInRegistry(named.name));
    }
    // Presentación elegida: tarjeta con lo que dice el registro y "Para qué se usa" (con fuente).
    const chosen = next?.actions[index];
    if (field === 'product' && chosen?.type === 'add_medication' && chosen.verified) {
      const r = medicationKnowledge.lookup(chosen.name);
      const m = r.status === 'found' ? (r.matches.find((x) => x.source.id === chosen.verified?.id) ?? r.matches[0]) : null;
      if (m) medInfoMessage(m, 'brand');
    }
  }, []);

  const confirm = useCallback(() => {
    const results: ExecResult[] = draftActions.confirm();
    if (!results.length) return;
    setHint(null);
    successHaptic();
    setMood('celebrate');
    later(() => setMood('idle'), 1600);
    const segment = results.find((r) => r.segment)?.segment ?? 'meds';
    const ok = results.some((r) => r.ok);
    conversation.add('buddy', results.map((r) => r.summary).join(' '), ok ? { proposal: JSON.stringify({ kind: DONE, segment }), proposalState: 'confirmed' } : {});
  }, []);

  const cancel = useCallback(() => {
    draftActions.cancel();
    setHint(null);
    reply(B.discarded);
  }, [reply]);

  const edit = useCallback((index: number, field: FieldKey) => {
    setHint(null);
    draftActions.ask(index, field);
  }, []);

  /** Deshacer desde la línea de una tarea terminada. */
  const undo = useCallback(
    (messageId: string) => {
      if (draftActions.undoLast()) {
        conversation.update(messageId, { proposalState: 'cancelled' });
        reply(B.undone);
      } else reply(B.nothingToUndo);
    },
    [reply],
  );

  const medInfo = useCallback(
    (name: string) => {
      // Primero el registro del INVIMA; si no está, lo que escribió el cuidador; si tampoco, se dice. Nunca de memoria.
      const r = medicationKnowledge.lookup(name);
      if (r.status === 'found') return medInfoMessage(r.matches[0], r.by);
      if (r.status === 'suggest') return reply(K.didYouMean(name), { quickReplies: r.suggestions.map(K.askAbout) });
      const known = elder && userId ? db.list('medications', userId, elder.id).find((m) => normalizeText(m.name) === normalizeText(name)) : undefined;
      const own = known?.purpose || known?.description;
      reply(own ? `${known!.name}: ${own} (según lo que registraste).` : K.none(name));
    },
    [reply, elder, userId],
  );

  const send = useCallback(
    (raw: string) => {
      const msg = raw.trim();
      if (!msg) return;
      // 1. Si la tarjeta está preguntando un dato, lo escrito es la respuesta (sin burbuja).
      if (draftActions.get()?.asking) return answer(msg);
      conversation.add('user', msg);
      if (awaitingMed.current) {
        awaitingMed.current = false;
        return medInfo(msg.replace(/^./, (c) => c.toUpperCase()));
      }
      const r = interpret(msg);
      if (!r.understood) return showMenu(B.notUnderstoodMenu, EXAMPLES.slice(0, 3));
      const first = r.actions[0];
      if (first.type === 'show_menu') return showMenu(B.menuIntro);
      if (first.type === 'medication_info') return medInfo(first.name);
      if (first.type === 'emergency') return reply(B.emergency, { quickReplies: [B.call123, ...(h.primary ? [B.callContact(h.primary.name)] : [])] });
      if (first.type === 'open_scan') {
        reply(B.openingCamera);
        return h.openScan();
      }
      if (first.type === 'suggest_routine') return reply(B.suggestIntro, { proposal: JSON.stringify({ suggestions: true }), proposalState: null });
      if (first.type === 'query_summary' && first.topic === 'recommendations') {
        const items = computeFeed();
        if (!items.length) return reply(strings.feed.noneToday);
        return reply(items.slice(0, 3).map((f) => `• ${f.title}`).join('\n'), { quickReplies: [B.seeFeed] });
      }
      if (first.type === 'query_summary') return reply(answerQuery(first.topic, first.match));
      const actions = r.actions.filter(isDraftable);
      if (!actions.length) return showMenu(B.notUnderstoodMenu, EXAMPLES.slice(0, 3));
      startDraft(actions);
    },
    [answer, medInfo, reply, showMenu, startDraft, h],
  );

  /** Una de las 8 acciones del menú. */
  const menu = useCallback(
    (key: MenuKey) => {
      const tpl = menuTemplate(key);
      if (tpl) return startDraft([tpl]);
      if (key === 'meal') return reply(B.whichMeal, { quickReplies: B.mealOptions.map((m) => `Programa ${m.toLowerCase()}`) });
      if (key === 'day') return reply(answerQuery('day', null));
      awaitingMed.current = true;
      reply(B.whichMed, { quickReplies: context().medicationNames.slice(0, 4) });
    },
    [reply, startDraft],
  );

  const quick = useCallback(
    (q: string) => {
      if (q === B.seeRoutine) return h.openRoutine('meds');
      if (q === B.seeFeed) return h.openFeed();
      if (elder && q === B.seeElderScreen(elder.firstName)) return h.openPreview();
      if (q === B.call123) return h.call('123');
      if (h.primary && q === B.callContact(h.primary.name)) return h.call(h.primary.phone);
      send(q);
    },
    [send, h, elder],
  );

  return { draft, typing, mood, hint, send, quick, answer, confirm, cancel, edit, undo, menu, suggestions: SUGGESTIONS };
}
