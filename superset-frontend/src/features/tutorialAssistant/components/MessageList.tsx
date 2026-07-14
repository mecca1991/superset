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
import { styled } from '@apache-superset/core/theme';
import { t } from '@apache-superset/core/translation';
import { Loading } from '@superset-ui/core/components';
import { TutorialMessage } from '../types';
import { MarkdownMessage } from './MarkdownMessage';

interface MessageListProps {
  messages: TutorialMessage[];
}

const StyledList = styled.div`
  ${({ theme }) => `
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: ${theme.sizeUnit * 2}px;
    padding: ${theme.sizeUnit * 3}px;
  `}
`;

const StyledMessage = styled.div<{ messageRole: TutorialMessage['role'] }>`
  ${({ theme, messageRole }) => `
    max-width: 85%;
    padding: ${theme.sizeUnit * 2}px ${theme.sizeUnit * 3}px;
    border-radius: ${theme.borderRadius}px;
    overflow-wrap: break-word;
    ${
      messageRole === 'user'
        ? `
          align-self: flex-end;
          white-space: pre-wrap;
          background-color: ${theme.colorPrimary};
          color: ${theme.colorWhite};
        `
        : `
          align-self: flex-start;
          background-color: ${theme.colorBgLayout};
          color: ${theme.colorText};
        `
    }
  `}
`;

const StyledStatus = styled.div`
  ${({ theme }) => `
    display: flex;
    align-items: center;
    gap: ${theme.sizeUnit}px;
    margin-top: ${theme.sizeUnit}px;
    font-size: ${theme.fontSizeSM}px;
    color: ${theme.colorTextTertiary};
  `}
`;

const StyledError = styled.div`
  ${({ theme }) => `
    color: ${theme.colorError};
    font-size: ${theme.fontSizeSM}px;
  `}
`;

const StyledEmptyState = styled.p`
  ${({ theme }) => `
    margin: auto;
    padding: ${theme.sizeUnit * 4}px;
    text-align: center;
    color: ${theme.colorTextSecondary};
  `}
`;

function AssistantBody({ message }: { message: TutorialMessage }) {
  if (message.status === 'error') {
    return (
      <StyledError role="alert">
        {message.content ||
          t('The tutorial assistant is currently unavailable.')}
      </StyledError>
    );
  }
  return (
    <>
      {message.content && <MarkdownMessage content={message.content} />}
      {message.status === 'streaming' && !message.content && (
        <StyledStatus>
          <Loading position="inline" />
          {t('Thinking…')}
        </StyledStatus>
      )}
      {message.status === 'stopped' && (
        <StyledStatus>{t('Stopped')}</StyledStatus>
      )}
    </>
  );
}

export function MessageList({ messages }: MessageListProps) {
  return (
    <StyledList role="log" aria-label={t('Conversation')}>
      {messages.length === 0 ? (
        <StyledEmptyState>
          {t(
            'Ask a question about Superset, for example "How do I create a dashboard?"',
          )}
        </StyledEmptyState>
      ) : (
        messages.map(message => (
          <StyledMessage key={message.id} messageRole={message.role}>
            {message.role === 'assistant' ? (
              <AssistantBody message={message} />
            ) : (
              message.content
            )}
          </StyledMessage>
        ))
      )}
    </StyledList>
  );
}

export default MessageList;
