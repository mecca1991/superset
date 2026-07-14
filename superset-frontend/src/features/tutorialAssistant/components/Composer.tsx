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
import { useEffect, useState } from 'react';
import { styled } from '@apache-superset/core/theme';
import { t } from '@apache-superset/core/translation';
import { Button, Input } from '@superset-ui/core/components';

interface ComposerProps {
  onSubmit: (question: string) => void;
  onStop: () => void;
  streaming: boolean;
  /** A question to restore into the input, e.g. after a failed request. */
  restoredQuestion?: string;
}

const MAX_QUESTION_LENGTH = 1000;

const StyledComposer = styled.form`
  ${({ theme }) => `
    display: flex;
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
}: ComposerProps) {
  const [question, setQuestion] = useState('');

  // Restore a preserved question (e.g. the widget failed the last request).
  useEffect(() => {
    if (restoredQuestion) {
      setQuestion(restoredQuestion);
    }
  }, [restoredQuestion]);

  const submit = () => {
    const trimmed = question.trim();
    if (!trimmed || streaming) {
      return;
    }
    onSubmit(trimmed);
    setQuestion('');
  };

  return (
    <StyledComposer
      onSubmit={event => {
        event.preventDefault();
        submit();
      }}
    >
      <Input
        autoFocus
        value={question}
        maxLength={MAX_QUESTION_LENGTH}
        onChange={event => setQuestion(event.target.value)}
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
