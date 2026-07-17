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
  render,
  screen,
  userEvent,
  waitFor,
} from 'spec/helpers/testing-library';
import { ErrorBoundary } from 'src/components';
import TutorialAssistant from '.';

jest.mock('./config', () => ({
  getTutorialAssistantConfig: () => ({ apiUrl: 'http://localhost:8100' }),
}));

const OPEN_LABEL = 'Open Superset Assistant';
const CLOSE_LABEL = 'Close Superset Assistant';

function deltaEvent(text: string): string {
  return `data: ${JSON.stringify({ type: 'delta', text })}\n\n`;
}

const DONE_EVENT = `data: ${JSON.stringify({ type: 'done' })}\n\n`;

/** Build a fetch Response whose body streams the given SSE event strings. */
function sseResponse(events: string[]): Response {
  const encoder = new TextEncoder();
  let index = 0;
  const stream = new ReadableStream({
    pull(controller) {
      if (index < events.length) {
        controller.enqueue(encoder.encode(events[index]));
        index += 1;
      } else {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

/**
 * A Response whose body emits one chunk and then stays open, so the widget
 * remains in the streaming state until the request is aborted.
 */
function openSseResponse(): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(deltaEvent('partial ')));
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

function renderWidget() {
  return render(<TutorialAssistant />, { useRouter: true });
}

function openAndAsk(question: string) {
  userEvent.click(screen.getByRole('button', { name: OPEN_LABEL }));
  userEvent.type(screen.getByRole('textbox', { name: 'Question' }), question);
  userEvent.click(screen.getByRole('button', { name: 'Send question' }));
}

beforeEach(() => {
  window.featureFlags = { IN_APP_TUTORIAL: true } as never;
  window.history.pushState({}, '', '/');
});

afterEach(() => {
  window.featureFlags = {} as never;
  jest.restoreAllMocks();
});

test('renders nothing when the feature flag is disabled', () => {
  window.featureFlags = {} as never;
  const fetchSpy = jest.spyOn(window, 'fetch');
  const { container } = render(<TutorialAssistant />, { useRouter: true });
  expect(container).toBeEmptyDOMElement();
  expect(fetchSpy).not.toHaveBeenCalled();
});

test('makes no assistant request until a question is submitted', () => {
  const fetchSpy = jest.spyOn(window, 'fetch');
  renderWidget();
  userEvent.click(screen.getByRole('button', { name: OPEN_LABEL }));
  expect(fetchSpy).not.toHaveBeenCalled();
});

test('streams delta chunks into the answer in order', async () => {
  jest
    .spyOn(window, 'fetch')
    .mockResolvedValue(
      sseResponse([
        deltaEvent('A dimension is '),
        deltaEvent('a field.'),
        DONE_EVENT,
      ]),
    );
  renderWidget();
  openAndAsk('What is a dimension?');

  await waitFor(() =>
    expect(screen.getByText('A dimension is a field.')).toBeInTheDocument(),
  );
});

test('sends the mapped route context with the request', async () => {
  window.history.pushState({}, '', '/sqllab/');
  const fetchSpy = jest
    .spyOn(window, 'fetch')
    .mockResolvedValue(sseResponse([deltaEvent('ok'), DONE_EVENT]));
  renderWidget();
  openAndAsk('How do I run a query?');

  await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
  const init = fetchSpy.mock.calls[0][1] as RequestInit;
  const body = JSON.parse(init.body as string);
  expect(body.context.route).toBe('sqllab');
});

test('stop aborts the in-flight request and marks the answer stopped', async () => {
  const abortSpy = jest.spyOn(AbortController.prototype, 'abort');
  jest.spyOn(window, 'fetch').mockResolvedValue(openSseResponse());
  renderWidget();
  openAndAsk('Explain metrics');

  const stop = await screen.findByRole('button', { name: 'Stop' });
  userEvent.click(stop);
  expect(abortSpy).toHaveBeenCalled();
  expect(screen.getByText('Stopped')).toBeInTheDocument();
});

test('closing the panel aborts the in-flight request', async () => {
  const abortSpy = jest.spyOn(AbortController.prototype, 'abort');
  jest.spyOn(window, 'fetch').mockResolvedValue(openSseResponse());
  renderWidget();
  openAndAsk('Explain metrics');

  await screen.findByRole('button', { name: 'Stop' });
  userEvent.click(screen.getByRole('button', { name: CLOSE_LABEL }));
  expect(abortSpy).toHaveBeenCalled();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('shows a retryable error and preserves the question on failure', async () => {
  jest.spyOn(window, 'fetch').mockResolvedValue(
    new Response(
      JSON.stringify({
        error: { code: 'MODEL_UNAVAILABLE', message: 'unavailable' },
      }),
      { status: 502 },
    ),
  );
  renderWidget();
  openAndAsk('What is a metric?');

  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent(/currently unavailable/i);
  expect(screen.getByRole('textbox', { name: 'Question' })).toHaveValue(
    'What is a metric?',
  );
});

// Note: Markdown link/HTML sanitization (spec §4.1) is enforced by
// MarkdownMessage via `skipHtml` + rehype-sanitize, but it cannot be
// asserted here — the repo globally mocks `react-markdown` to a passthrough
// in spec/helpers/shim.tsx (a known ESM-import workaround), so no parsing or
// sanitization runs under jest. It is verified at runtime in the browser.

test('excludes a stopped exchange from the next request history', async () => {
  const fetchSpy = jest.spyOn(window, 'fetch');
  // First answer stays open so it can be stopped mid-stream.
  fetchSpy.mockResolvedValueOnce(openSseResponse());
  renderWidget();
  openAndAsk('first question');
  const stop = await screen.findByRole('button', { name: 'Stop' });
  userEvent.click(stop);

  // Second question completes normally.
  fetchSpy.mockResolvedValueOnce(
    sseResponse([deltaEvent('answer'), DONE_EVENT]),
  );
  openAndAsk('second question');

  await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
  const secondBody = JSON.parse(
    (fetchSpy.mock.calls[1][1] as RequestInit).body as string,
  );
  // The stopped exchange is not sent; history is empty and well-formed.
  expect(secondBody.history).toEqual([]);
  expect(secondBody.question).toBe('second question');
});

test('focuses the question input when the panel opens', () => {
  renderWidget();
  userEvent.click(screen.getByRole('button', { name: OPEN_LABEL }));
  expect(screen.getByRole('textbox', { name: 'Question' })).toHaveFocus();
});

test('offers clickable example questions in the empty state and asks them', async () => {
  const fetchSpy = jest
    .spyOn(window, 'fetch')
    .mockResolvedValue(sseResponse([deltaEvent('ok'), DONE_EVENT]));
  renderWidget();
  userEvent.click(screen.getByRole('button', { name: OPEN_LABEL }));

  const example = screen.getByRole('button', {
    name: 'How do I create a dashboard?',
  });
  userEvent.click(example);

  await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
  const body = JSON.parse(
    (fetchSpy.mock.calls[0][1] as RequestInit).body as string,
  );
  expect(body.question).toBe('How do I create a dashboard?');
});

test('announces the completed answer once via a polite live region', async () => {
  jest
    .spyOn(window, 'fetch')
    .mockResolvedValue(
      sseResponse([
        deltaEvent('A dimension '),
        deltaEvent('groups data.'),
        DONE_EVENT,
      ]),
    );
  renderWidget();
  openAndAsk('What is a dimension?');

  await waitFor(() => {
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('A dimension groups data.');
  });
});

test('shows a timeout-specific message on TIMEOUT', async () => {
  jest
    .spyOn(window, 'fetch')
    .mockResolvedValue(
      sseResponse([
        `data: ${JSON.stringify({ type: 'error', code: 'TIMEOUT', message: 'x' })}\n\n`,
      ]),
    );
  renderWidget();
  openAndAsk('slow question');

  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent(/took too long/i);
});

test('keeps Tab focus within the panel (focus trap)', () => {
  renderWidget();
  userEvent.click(screen.getByRole('button', { name: OPEN_LABEL }));
  const close = screen.getByRole('button', { name: CLOSE_LABEL });
  const input = screen.getByRole('textbox', { name: 'Question' });

  // Shift+Tab from the first focusable (close) wraps to the last (input).
  close.focus();
  userEvent.tab({ shift: true });
  expect(input).toHaveFocus();
});

test('a crash inside the error boundary does not break sibling content', () => {
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
  const Boom = () => {
    throw new Error('boom');
  };
  render(
    <>
      <div>host page content</div>
      <ErrorBoundary showMessage={false}>
        <Boom />
      </ErrorBoundary>
    </>,
  );
  expect(screen.getByText('host page content')).toBeInTheDocument();
  spy.mockRestore();
});
