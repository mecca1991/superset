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
import { forwardRef } from 'react';
import { styled } from '@apache-superset/core/theme';
import { t } from '@apache-superset/core/translation';
import { Icons } from '@superset-ui/core/components/Icons';

interface LauncherProps {
  expanded: boolean;
  onClick: () => void;
}

const StyledLauncher = styled.button`
  ${({ theme }) => `
    position: fixed;
    right: ${theme.sizeUnit * 4}px;
    bottom: ${theme.sizeUnit * 4}px;
    z-index: ${theme.zIndexPopupBase};
    width: ${theme.sizeUnit * 12}px;
    height: ${theme.sizeUnit * 12}px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    background-color: ${theme.colorPrimary};
    color: ${theme.colorWhite};
    box-shadow: ${theme.boxShadow};

    &:hover,
    &:focus-visible {
      background-color: ${theme.colorPrimaryHover};
    }
  `}
`;

export const Launcher = forwardRef<HTMLButtonElement, LauncherProps>(
  ({ expanded, onClick }, ref) => (
    <StyledLauncher
      ref={ref}
      type="button"
      aria-label={t('Open tutorial assistant')}
      aria-expanded={expanded}
      aria-haspopup="dialog"
      onClick={onClick}
    >
      <Icons.QuestionCircleOutlined iconSize="l" aria-hidden />
    </StyledLauncher>
  ),
);

export default Launcher;
