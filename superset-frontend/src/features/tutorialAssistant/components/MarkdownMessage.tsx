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
    /* Collapse the leading/trailing margins of the first/last block so the
       rendered answer sits flush inside the message bubble. */
    & > *:first-child {
      margin-top: 0;
    }
    & > *:last-child {
      margin-bottom: 0;
    }
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
      margin: 0 0 ${theme.sizeUnit * 2}px;
    }
    strong {
      font-weight: ${theme.fontWeightStrong};
      color: ${theme.colorText};
    }
    /* Headings render compactly to suit the narrow panel: a bold label rather
       than a browser-scaled heading. */
    h1,
    h2,
    h3,
    h4,
    h5,
    h6 {
      margin: ${theme.sizeUnit * 3}px 0 ${theme.sizeUnit}px;
      font-size: ${theme.fontSizeLG}px;
      font-weight: ${theme.fontWeightStrong};
      line-height: ${theme.lineHeightHeading4};
      color: ${theme.colorTextHeading};
    }
    ol,
    ul {
      margin: 0 0 ${theme.sizeUnit * 2}px;
      padding-left: ${theme.sizeUnit * 5}px;
    }
    /* Space list items so multi-step procedures are easy to scan. */
    li + li {
      margin-top: ${theme.sizeUnit}px;
    }
    /* Nested lists tuck tighter under their parent item. */
    li > ol,
    li > ul {
      margin: ${theme.sizeUnit}px 0 0;
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
 * a new tab. The system prompt instructs the model to emit documentation
 * references as Markdown links so they render clickable here.
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
