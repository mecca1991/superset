/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { FeatureFlag, isFeatureEnabled } from '@superset-ui/core';
import { t } from '@apache-superset/core/translation';
import { Launcher } from './components/Launcher';
import { Panel } from './components/Panel';
import { MessageList } from './components/MessageList';
import { Composer } from './components/Composer';
import { LiveRegion } from './components/LiveRegion';
import { getTutorialAssistantConfig } from './config';
import { useRouteContext } from './useRouteContext';
import { askAssistant, TutorialAssistantError } from './streamClient';
import {
  TutorialAssistantErrorCode,
  TutorialHistoryEntry,
  TutorialMessage,
} from './types';

const MAX_HISTORY_ENTRIES = 6;
const MAX_HISTORY_ENTRY_LENGTH = 2000;
const UNAVAILABLE_MESSAGE = t(
  'The Superset Assistant is currently unavailable.',
);
const TIMEOUT_MESSAGE = t(
  'The Superset Assistant took too long to respond. Please try again.',
);

function messageForError(code: TutorialAssistantErrorCode): string {
  return code === TutorialAssistantErrorCode.Timeout
    ? TIMEOUT_MESSAGE
    : UNAVAILABLE_MESSAGE;
}

/**
 * Trim conversation history to the service limits (spec section 5.5).
 *
 * Messages accumulate as (user, assistant) pairs. Only exchanges whose answer
 * finished are included, dropped as whole pairs — so a stopped, errored, or
 * still-streaming answer never enters history, and the result stays strictly
 * alternating and ends with an assistant turn as the service requires.
 */
function buildHistory(messages: TutorialMessage[]): TutorialHistoryEntry[] {
  const entries: TutorialHistoryEntry[] = [];
  for (let i = 0; i + 1 < messages.length; i += 2) {
    const user = messages[i];
    const assistant = messages[i + 1];
    if (
      user.role === 'user' &&
      assistant.role === 'assistant' &&
      assistant.status === 'done'
    ) {
      entries.push(
        {
          role: 'user',
          content: user.content.slice(0, MAX_HISTORY_ENTRY_LENGTH),
        },
        {
          role: 'assistant',
          content: assistant.content.slice(0, MAX_HISTORY_ENTRY_LENGTH),
        },
      );
    }
  }
  return entries.slice(-MAX_HISTORY_ENTRIES);
}

function TutorialAssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<TutorialMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [restoredQuestion, setRestoredQuestion] = useState<string>();
  const [announcement, setAnnouncement] = useState('');
  const launcherRef = useRef<HTMLButtonElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const nextId = useRef(0);
  const context = useRouteContext();
  const { apiUrl } = getTutorialAssistantConfig();

  const abortActive = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const updateMessage = useCallback(
    (id: string, patch: Partial<TutorialMessage>) => {
      setMessages(prev =>
        prev.map(message =>
          message.id === id ? { ...message, ...patch } : message,
        ),
      );
    },
    [],
  );

  const handleSubmit = useCallback(
    (question: string) => {
      // A new question replaces any in-flight request.
      abortActive();
      setRestoredQuestion(undefined);

      const userId = `${nextId.current}`;
      const assistantId = `${nextId.current + 1}`;
      nextId.current += 2;

      const history = buildHistory(messages);
      setMessages(prev => [
        ...prev,
        { id: userId, role: 'user', content: question },
        {
          id: assistantId,
          role: 'assistant',
          content: '',
          status: 'streaming',
        },
      ]);
      setStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      if (!apiUrl) {
        updateMessage(assistantId, {
          status: 'error',
          content: UNAVAILABLE_MESSAGE,
          errorCode: TutorialAssistantErrorCode.ModelUnavailable,
        });
        setStreaming(false);
        setRestoredQuestion(question);
        setAnnouncement(UNAVAILABLE_MESSAGE);
        return;
      }

      let answer = '';
      askAssistant({
        apiUrl,
        question,
        context,
        history,
        signal: controller.signal,
        onDelta: text => {
          answer += text;
          updateMessage(assistantId, { content: answer });
        },
      })
        .then(() => {
          if (controller.signal.aborted) {
            return;
          }
          updateMessage(assistantId, { status: 'done' });
          // Announce the completed answer once, not per token (spec 4.2).
          setAnnouncement(answer);
        })
        .catch(error => {
          const code =
            error instanceof TutorialAssistantError
              ? error.code
              : TutorialAssistantErrorCode.ModelUnavailable;
          const message = messageForError(code);
          updateMessage(assistantId, {
            status: 'error',
            content: message,
            errorCode: code,
          });
          setRestoredQuestion(question);
          setAnnouncement(message);
        })
        .finally(() => {
          if (abortRef.current === controller) {
            abortRef.current = null;
          }
          setStreaming(false);
        });
    },
    [abortActive, apiUrl, context, messages, updateMessage],
  );

  const handleStop = useCallback(() => {
    abortActive();
    setStreaming(false);
    setMessages(prev =>
      prev.map(message =>
        message.status === 'streaming'
          ? { ...message, status: 'stopped' }
          : message,
      ),
    );
    setAnnouncement(t('Response stopped.'));
  }, [abortActive]);

  const openPanel = useCallback(() => setOpen(true), []);

  const closePanel = useCallback(() => {
    // Closing the panel aborts any in-flight request.
    abortActive();
    setStreaming(false);
    setOpen(false);
    launcherRef.current?.focus();
  }, [abortActive]);

  // Abort a pending request if the widget unmounts.
  useEffect(() => () => abortActive(), [abortActive]);

  return (
    <>
      <Launcher ref={launcherRef} expanded={open} onClick={openPanel} />
      {open && (
        <Panel onClose={closePanel}>
          <MessageList messages={messages} onExampleClick={handleSubmit} />
          <Composer
            onSubmit={handleSubmit}
            onStop={handleStop}
            streaming={streaming}
            restoredQuestion={restoredQuestion}
            autoFocus={open}
          />
          <LiveRegion message={announcement} />
        </Panel>
      )}
    </>
  );
}

/**
 * Feature-flag gate: when IN_APP_TUTORIAL is disabled the widget component
 * is never mounted and no assistant code paths execute.
 */
export function TutorialAssistant() {
  if (!isFeatureEnabled(FeatureFlag.InAppTutorial)) {
    return null;
  }
  return <TutorialAssistantWidget />;
}

export default TutorialAssistant;
