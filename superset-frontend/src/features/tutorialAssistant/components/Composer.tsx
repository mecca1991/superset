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
import { KeyboardEvent, useEffect, useRef, useState } from 'react';
import { styled } from '@apache-superset/core/theme';
import { t } from '@apache-superset/core/translation';
import { Button, Input } from '@superset-ui/core/components';
import type { TextAreaRef } from '@superset-ui/core/components/Input';

interface ComposerProps {
  onSubmit: (question: string) => void;
  onStop: () => void;
  streaming: boolean;
  /** A question to restore into the input, e.g. after a failed request. */
  restoredQuestion?: string;
  /** Focus the input when this becomes true (e.g. the panel just opened). */
  autoFocus?: boolean;
}

const MAX_QUESTION_LENGTH = 1000;

const StyledComposer = styled.form`
  ${({ theme }) => `
    display: flex;
    align-items: flex-end;
    gap: ${theme.sizeUnit * 2}px;
    padding: ${theme.sizeUnit * 3}px;
    border-top: 1px solid ${theme.colorSplit};
  `}
`;

export function Composer({
  onSubmit,
  onStop,
  streaming,
  restoredQuestion,
  autoFocus,
}: ComposerProps) {
  const [question, setQuestion] = useState('');
  const inputRef = useRef<TextAreaRef>(null);

  // Restore a preserved question (e.g. the widget failed the last request).
  useEffect(() => {
    if (restoredQuestion) {
      setQuestion(restoredQuestion);
    }
  }, [restoredQuestion]);

  // Move focus to the input when the panel opens.
  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  const submit = () => {
    const trimmed = question.trim();
    if (!trimmed || streaming) {
      return;
    }
    onSubmit(trimmed);
    setQuestion('');
  };

  // Enter submits; Shift+Enter inserts a newline.
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <StyledComposer
      onSubmit={event => {
        event.preventDefault();
        submit();
      }}
    >
      <Input.TextArea
        ref={inputRef}
        value={question}
        maxLength={MAX_QUESTION_LENGTH}
        autoSize={{ minRows: 1, maxRows: 4 }}
        onChange={event => setQuestion(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t('Ask a question about Superset')}
        aria-label={t('Question')}
      />
      {streaming ? (
        <Button buttonStyle="secondary" onClick={onStop} aria-label={t('Stop')}>
          {t('Stop')}
        </Button>
      ) : (
        <Button
          buttonStyle="primary"
          htmlType="submit"
          disabled={!question.trim()}
          aria-label={t('Send question')}
        >
          {t('Send')}
        </Button>
      )}
    </StyledComposer>
  );
}

export default Composer;
