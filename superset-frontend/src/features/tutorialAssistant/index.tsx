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
import { useCallback, useRef, useState } from 'react';
import { FeatureFlag, isFeatureEnabled } from '@superset-ui/core';
import { t } from '@apache-superset/core/translation';
import { Launcher } from './components/Launcher';
import { Panel } from './components/Panel';
import { MessageList } from './components/MessageList';
import { Composer } from './components/Composer';
import { TutorialMessage } from './types';

/**
 * Placeholder reply used until the widget is wired to the assistant
 * service. Replaced by streamed answers in a later milestone.
 */
const PLACEHOLDER_REPLY = t(
  'The tutorial assistant service is not connected yet. This is a placeholder response.',
);

function TutorialAssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<TutorialMessage[]>([]);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const nextMessageId = useRef(0);

  const openPanel = useCallback(() => setOpen(true), []);

  const closePanel = useCallback(() => {
    setOpen(false);
    launcherRef.current?.focus();
  }, []);

  const handleSubmit = useCallback((question: string) => {
    const baseId = nextMessageId.current;
    nextMessageId.current += 2;
    setMessages(prev => [
      ...prev,
      { id: `${baseId}`, role: 'user', content: question },
      { id: `${baseId + 1}`, role: 'assistant', content: PLACEHOLDER_REPLY },
    ]);
  }, []);

  return (
    <>
      <Launcher ref={launcherRef} expanded={open} onClick={openPanel} />
      {open && (
        <Panel onClose={closePanel}>
          <MessageList messages={messages} />
          <Composer onSubmit={handleSubmit} />
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
