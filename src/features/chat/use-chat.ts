/**
 * Hook del chat de BUDDY: une el intérprete, el borrador persistente y el ejecutor.
 * - Cada petición que cambia datos crea un borrador; BUDDY pregunta de a un dato obligatorio con respuestas rápidas.
 * - Con lo obligatorio completo deja de preguntar y agrega una confirmación como ÚLTIMO mensaje; la tarjeta fija sobre
 *   el compositor también se activa.
 * - Al confirmar ejecuta por el mismo camino que Rutina y responde "Listo, agregué…" con "Ver en Rutina" y "Deshacer".
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { draftComplete, isConfirmWord, nextQuestion, questionFor, type Draft } from '@/domain/assistant/draft';
import { EXAMPLES } from '@/domain/assistant/engine';
import type { FieldKey } from '@/domain/assistant/types';
import { useDb } from '@/infrastructure/local/db';
import { strings } from '@/i18n';
import { SUGGESTIONS, answerQuery, context, conversation, draftActions, interpret, isDraftable, type ExecResult, type RoutineSegment } from '@/state/assistant';
import { useActiveElder, useUserId } from '@/state/data';
import { computeFeed } from '@/state/feed';
import { successHaptic } from '@/utils/haptics';

const B = strings.buddy;
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

export const FINAL = 'final';

export function useDraft(): Draft | null {
  const userId = useUserId();
  const elder = useActiveElder();
  return useDb((s) => (userId && elder ? ((s.drafts[userId]?.[draftActions.key(elder.id)] as Draft | undefined) ?? null) : null));
}

export function useBuddyChat(h: ChatHandlers) {
  const draft = useDraft();
  const elder = useActiveElder();
  const [typing, setTyping] = useState(false);
  const [mood, setMood] = useState<ChatMood>('idle');
  const [lastSegment, setLastSegment] = useState<RoutineSegment>('meds');
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

  /** Después de cada cambio del borrador: pregunta lo que falte o, si está completo, deja la confirmación al final. */
  const follow = useCallback(
    (d: Draft | null) => {
      if (!d) return;
      if (d.asking) {
        const q = questionFor(d.actions[d.asking.index], d.asking.field, context());
        reply(q.question, { quickReplies: q.quickReplies });
      } else if (draftComplete(d)) {
        // Una sola confirmación abierta: las anteriores se cierran.
        closeFinals('cancelled');
        reply(B.readyToConfirm, { proposal: JSON.stringify({ kind: FINAL, draftId: d.id }), proposalState: 'open', quickReplies: [] });
      }
    },
    [reply],
  );

  const confirm = useCallback(() => {
    const results: ExecResult[] = draftActions.confirm();
    if (!results.length) return;
    closeFinals('confirmed');
    successHaptic();
    setMood('celebrate');
    later(() => setMood('idle'), 1600);
    const seg = results.find((r) => r.segment)?.segment ?? 'meds';
    setLastSegment(seg);
    const ok = results.some((r) => r.ok);
    reply(results.map((r) => r.summary).join(' '), {
      quickReplies: ok ? [B.seeRoutine, strings.common.undo, ...(elder ? [B.seeElderScreen(elder.firstName)] : [])] : [],
    });
  }, [reply, elder]);

  const cancel = useCallback(() => {
    draftActions.cancel();
    closeFinals('cancelled');
    reply(B.discarded);
  }, [reply]);

  const edit = useCallback(
    (index: number, field: FieldKey) => {
      const d = draftActions.ask(index, field);
      if (d) follow(d);
    },
    [follow],
  );

  const send = useCallback(
    (raw: string) => {
      const msg = raw.trim();
      if (!msg) return;
      conversation.add('user', msg);
      const current = draftActions.get();
      // 1. Si BUDDY estaba preguntando un dato, el mensaje es la respuesta.
      if (current?.asking) {
        const { index, field } = current.asking;
        const before = JSON.stringify(current.actions[index]);
        const next = draftActions.answer(msg);
        // No se entendió el dato (p. ej. una hora cuando se pedía la dosis): se vuelve a preguntar sin inventar.
        if (next?.asking && next.asking.index === index && next.asking.field === field && JSON.stringify(next.actions[index]) === before) {
          const q = questionFor(next.actions[index], field, context());
          return reply(`${B.notThatData} ${q.question}`, { quickReplies: q.quickReplies });
        }
        return follow(next);
      }
      // 2. "Sí" / "confirmar" con el borrador completo.
      if (current && draftComplete(current) && isConfirmWord(msg)) return confirm();
      const r = interpret(msg);
      if (!r.understood) return reply(r.reply ?? '', { quickReplies: EXAMPLES.slice(0, 3) });
      const first = r.actions[0];
      if (first.type === 'emergency') return reply(B.emergency, { quickReplies: [B.call123, ...(h.primary ? [B.callContact(h.primary.name)] : [])] });
      if (first.type === 'open_scan') {
        reply(B.openingCamera);
        return h.openScan();
      }
      if (first.type === 'suggest_routine') return reply(B.suggestIntro, { proposal: JSON.stringify({ suggestions: true }), proposalState: null });
      if (first.type === 'query_summary' && first.topic === 'recommendations') {
        const items = computeFeed();
        if (!items.length) return reply(strings.feed.noneToday);
        return reply(items.slice(0, 3).map((f) => `• ${f.title}. ${f.reason}`).join('\n'), { quickReplies: [B.seeFeed] });
      }
      if (first.type === 'query_summary') return reply(answerQuery(first.topic, first.match));
      const actions = r.actions.filter(isDraftable);
      if (!actions.length) return reply(r.reply ?? B.notUnderstood, { quickReplies: EXAMPLES.slice(0, 3) });
      if (current) closeFinals('cancelled');
      const d = draftActions.start(actions);
      const q = nextQuestion(d.actions, context());
      reply(q ? B.draftIntro : B.proposalIntro);
      later(() => follow(d), REPLY_MS + 40);
    },
    [confirm, follow, reply, h],
  );

  const quick = useCallback(
    (q: string) => {
      if (q === strings.common.undo) {
        conversation.add('user', strings.common.undo);
        return reply(draftActions.undoLast() ? B.undone : B.nothingToUndo);
      }
      if (q === B.seeRoutine) return h.openRoutine(lastSegment);
      if (q === B.seeFeed) return h.openFeed();
      if (elder && q === B.seeElderScreen(elder.firstName)) return h.openPreview();
      if (q === B.call123) return h.call('123');
      if (h.primary && q === B.callContact(h.primary.name)) return h.call(h.primary.phone);
      send(q);
    },
    [send, reply, h, lastSegment, elder],
  );

  return { draft, typing, mood, send, quick, confirm, cancel, edit, suggestions: SUGGESTIONS };
}

/** Cierra las tarjetas de confirmación abiertas del historial (solo la última puede estar activa). */
function closeFinals(state: 'confirmed' | 'cancelled') {
  const s = useDb.getState();
  Object.values(s.messages)
    .filter((m) => m.proposalState === 'open' && m.proposal?.includes(`"kind":"${FINAL}"`))
    .forEach((m) => conversation.update(m.id, { proposalState: state }));
}
