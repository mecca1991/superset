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
import { Launcher } from './components/Launcher';
import { Panel } from './components/Panel';
import { MessageList } from './components/MessageList';
import { Composer } from './components/Composer';
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
const UNAVAILABLE_MESSAGE = 'The tutorial assistant is currently unavailable.';

/** Trim conversation history to the service limits (spec section 5.5). */
function buildHistory(messages: TutorialMessage[]): TutorialHistoryEntry[] {
  return messages
    .filter(message => message.status !== 'error')
    .slice(-MAX_HISTORY_ENTRIES)
    .map(({ role, content }) => ({
      role,
      content: content.slice(0, MAX_HISTORY_ENTRY_LENGTH),
    }));
}

function TutorialAssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<TutorialMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [restoredQuestion, setRestoredQuestion] = useState<string>();
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
        })
        .catch(error => {
          const code =
            error instanceof TutorialAssistantError
              ? error.code
              : TutorialAssistantErrorCode.ModelUnavailable;
          updateMessage(assistantId, {
            status: 'error',
            content: UNAVAILABLE_MESSAGE,
            errorCode: code,
          });
          setRestoredQuestion(question);
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
          <MessageList messages={messages} />
          <Composer
            onSubmit={handleSubmit}
            onStop={handleStop}
            streaming={streaming}
            restoredQuestion={restoredQuestion}
          />
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
