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
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { styled } from '@apache-superset/core/theme';

const StyledMarkdown = styled.div`
  ${({ theme }) => `
    a {
      color: ${theme.colorLink};
    }
    code {
      font-family: ${theme.fontFamilyCode};
      background-color: ${theme.colorBgLayout};
      padding: 0 ${theme.sizeUnit / 2}px;
      border-radius: ${theme.borderRadiusSM}px;
    }
    p {
      margin: 0 0 ${theme.sizeUnit}px;
    }
    p:last-child {
      margin-bottom: 0;
    }
    ol,
    ul {
      margin: 0;
      padding-left: ${theme.sizeUnit * 5}px;
    }
  `}
`;

interface MarkdownMessageProps {
  content: string;
}

/**
 * Renders assistant answers as Markdown with raw HTML disabled (skipHtml)
 * and links/attributes sanitized via rehype-sanitize (spec section 4.1).
 * CommonMark covers the required subset: paragraphs, numbered lists,
 * bullets, emphasis, links, and inline code. External links open safely in
 * a new tab.
 */
export function MarkdownMessage({ content }: MarkdownMessageProps) {
  return (
    <StyledMarkdown>
      <ReactMarkdown
        skipHtml
        rehypePlugins={[rehypeSanitize]}
        components={{
          a: ({ node: _node, children, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </StyledMarkdown>
  );
}

export default MarkdownMessage;
