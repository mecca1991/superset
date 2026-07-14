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
import { KeyboardEvent, ReactNode } from 'react';
import { styled } from '@apache-superset/core/theme';
import { t } from '@apache-superset/core/translation';
import { Icons } from '@superset-ui/core/components/Icons';
import { Typography } from '@superset-ui/core/components/Typography';

interface PanelProps {
  onClose: () => void;
  children: ReactNode;
}

const StyledPanel = styled.section`
  ${({ theme }) => `
    position: fixed;
    right: ${theme.sizeUnit * 4}px;
    bottom: ${theme.sizeUnit * 18}px;
    z-index: ${theme.zIndexPopupBase + 1};
    display: flex;
    flex-direction: column;
    width: 380px;
    height: 560px;
    max-width: calc(100vw - ${theme.sizeUnit * 8}px);
    max-height: calc(100vh - ${theme.sizeUnit * 24}px);
    background-color: ${theme.colorBgContainer};
    border-radius: ${theme.borderRadiusLG}px;
    box-shadow: ${theme.boxShadow};

    @media (max-width: 576px) {
      right: ${theme.sizeUnit * 2}px;
      left: ${theme.sizeUnit * 2}px;
      width: auto;
      max-width: none;
    }
  `}
`;

const StyledHeader = styled.header`
  ${({ theme }) => `
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: ${theme.sizeUnit * 3}px;
    border-bottom: 1px solid ${theme.colorSplit};
  `}
`;

const StyledCloseButton = styled.button`
  ${({ theme }) => `
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    cursor: pointer;
    padding: ${theme.sizeUnit}px;
    border-radius: ${theme.borderRadius}px;
    color: ${theme.colorTextSecondary};

    &:hover,
    &:focus-visible {
      color: ${theme.colorText};
      background-color: ${theme.colorBgLayout};
    }
  `}
`;

export function Panel({ onClose, children }: PanelProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
    }
  };

  return (
    <StyledPanel
      role="dialog"
      aria-label={t('Tutorial assistant')}
      onKeyDown={handleKeyDown}
    >
      <StyledHeader>
        <Typography.Text strong>{t('Tutorial assistant')}</Typography.Text>
        <StyledCloseButton
          type="button"
          aria-label={t('Close tutorial assistant')}
          onClick={onClose}
        >
          <Icons.CloseOutlined iconSize="m" aria-hidden />
        </StyledCloseButton>
      </StyledHeader>
      {children}
    </StyledPanel>
  );
}

export default Panel;
