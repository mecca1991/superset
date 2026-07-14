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
import {
  TutorialAssistantErrorCode,
  TutorialContext,
  TutorialHistoryEntry,
} from './types';

export class TutorialAssistantError extends Error {
  code: TutorialAssistantErrorCode;

  constructor(code: TutorialAssistantErrorCode, message: string) {
    super(message);
    this.name = 'TutorialAssistantError';
    this.code = code;
  }
}

interface AskParams {
  apiUrl: string;
  question: string;
  context: TutorialContext;
  history: TutorialHistoryEntry[];
  signal: AbortSignal;
  onDelta: (text: string) => void;
}

const DEFAULT_ERROR = TutorialAssistantErrorCode.ModelUnavailable;

// A complete SSE event is a small JSON payload; anything this large without
// an event boundary indicates a malformed stream.
const MAX_BUFFER_BYTES = 1_000_000;

function parseErrorCode(value: unknown): TutorialAssistantErrorCode {
  switch (value) {
    case TutorialAssistantErrorCode.Validation:
    case TutorialAssistantErrorCode.ModelUnavailable:
    case TutorialAssistantErrorCode.Timeout:
      return value;
    default:
      return DEFAULT_ERROR;
  }
}

/**
 * POST a question to the assistant and stream the answer.
 *
 * Uses fetch and reads response.body as a stream because the endpoint is a
 * POST with a JSON body, which native EventSource cannot do. Deltas are
 * delivered through onDelta; the promise resolves when the stream ends and
 * rejects with a TutorialAssistantError on any failure.
 */
export async function askAssistant({
  apiUrl,
  question,
  context,
  history,
  signal,
  onDelta,
}: AskParams): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${apiUrl.replace(/\/$/, '')}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, context, history }),
      signal,
    });
  } catch {
    if (signal.aborted) {
      return;
    }
    throw new TutorialAssistantError(DEFAULT_ERROR, 'Network request failed');
  }

  if (!response.ok || !response.body) {
    // Pre-stream failures use the JSON error envelope.
    let code = DEFAULT_ERROR;
    let message = 'The tutorial assistant is currently unavailable.';
    try {
      const envelope = await response.json();
      code = parseErrorCode(envelope?.error?.code);
      message = envelope?.error?.message ?? message;
    } catch {
      // Non-JSON error body; fall back to the defaults above.
    }
    throw new TutorialAssistantError(code, message);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const handleEvent = (raw: string) => {
    const line = raw.split('\n').find(part => part.startsWith('data: '));
    if (!line) {
      return;
    }
    // Boundary buffering already guarantees whole events here; this guard
    // defends only against a genuinely malformed data line, which is skipped
    // rather than tearing down the stream.
    let payload;
    try {
      payload = JSON.parse(line.slice('data: '.length));
    } catch {
      return;
    }
    if (payload.type === 'delta') {
      onDelta(payload.text ?? '');
    } else if (payload.type === 'error') {
      throw new TutorialAssistantError(
        parseErrorCode(payload.code),
        payload.message ?? 'The tutorial assistant is currently unavailable.',
      );
    }
    // 'done' needs no action; the reader loop ends when the stream closes.
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      // SSE events are separated by a blank line.
      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const event = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        handleEvent(event);
        boundary = buffer.indexOf('\n\n');
      }
      // Guard against a malformed stream that never emits an event boundary,
      // which would otherwise grow the buffer without bound.
      if (buffer.length > MAX_BUFFER_BYTES) {
        throw new TutorialAssistantError(DEFAULT_ERROR, 'Stream buffer overflow');
      }
    }
  } catch (error) {
    if (signal.aborted) {
      return;
    }
    if (error instanceof TutorialAssistantError) {
      throw error;
    }
    throw new TutorialAssistantError(DEFAULT_ERROR, 'Stream read failed');
  }
}
