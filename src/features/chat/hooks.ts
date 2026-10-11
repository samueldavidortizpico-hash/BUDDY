import { useCallback, useEffect, useRef, useState } from 'react';

import { useRepositoryValue } from '@/hooks/use-repository';
import {
  chatRepository,
  medicationRepository,
  profileRepository,
  vitalsRepository,
  wellbeingRepository,
} from '@/repositories/in-memory';

import { resetChat, respond, sendUserMessage } from './use-cases';

export { SAFETY_NOTE, SUGGESTIONS } from './replies';

const deps = {
  chat: chatRepository,
  medications: medicationRepository,
  vitals: vitalsRepository,
  wellbeing: wellbeingRepository,
  profile: profileRepository,
};

/** Tiempo que BUDDY "escribe" antes de responder (solo efecto visual). */
const TYPING_MS = 1100;

export function useChat() {
  const messages = useRepositoryValue(chatRepository, chatRepository.list);
  const [typing, setTyping] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const send = useCallback((text: string) => {
    const sent = sendUserMessage(chatRepository, text, new Date());
    if (!sent) return false;
    setTyping(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      respond(deps, sent.text, new Date());
      setTyping(false);
    }, TYPING_MS);
    return true;
  }, []);

  const reset = useCallback(() => resetChat(chatRepository, profileRepository, new Date()), []);

  return { messages, typing, send, reset };
}
