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
  fireEvent,
  render,
  screen,
  userEvent,
} from 'spec/helpers/testing-library';
import { ErrorBoundary } from 'src/components';
import TutorialAssistant from '.';

const OPEN_LABEL = 'Open tutorial assistant';
const CLOSE_LABEL = 'Close tutorial assistant';

beforeEach(() => {
  window.featureFlags = { IN_APP_TUTORIAL: true } as never;
});

afterEach(() => {
  window.featureFlags = {} as never;
});

test('renders nothing when the feature flag is disabled', () => {
  window.featureFlags = {} as never;
  const { container } = render(<TutorialAssistant />);
  expect(container).toBeEmptyDOMElement();
});

test('renders the launcher but not the panel by default', () => {
  render(<TutorialAssistant />);
  expect(screen.getByRole('button', { name: OPEN_LABEL })).toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('opens the panel from the launcher and closes it with the close button', () => {
  render(<TutorialAssistant />);
  userEvent.click(screen.getByRole('button', { name: OPEN_LABEL }));
  expect(
    screen.getByRole('dialog', { name: 'Tutorial assistant' }),
  ).toBeInTheDocument();

  userEvent.click(screen.getByRole('button', { name: CLOSE_LABEL }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('moves focus to the question input when opened', () => {
  render(<TutorialAssistant />);
  userEvent.click(screen.getByRole('button', { name: OPEN_LABEL }));
  expect(screen.getByRole('textbox', { name: 'Question' })).toHaveFocus();
});

test('closes on Escape and returns focus to the launcher', () => {
  render(<TutorialAssistant />);
  const launcher = screen.getByRole('button', { name: OPEN_LABEL });
  userEvent.click(launcher);
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(launcher).toHaveFocus();
});

test('returns focus to the launcher when closed with the close button', () => {
  render(<TutorialAssistant />);
  const launcher = screen.getByRole('button', { name: OPEN_LABEL });
  userEvent.click(launcher);
  userEvent.click(screen.getByRole('button', { name: CLOSE_LABEL }));
  expect(launcher).toHaveFocus();
});

test('shows the question and a placeholder reply after submitting', () => {
  render(<TutorialAssistant />);
  userEvent.click(screen.getByRole('button', { name: OPEN_LABEL }));
  userEvent.type(
    screen.getByRole('textbox', { name: 'Question' }),
    'How do I create a dashboard?',
  );
  userEvent.click(screen.getByRole('button', { name: 'Send question' }));

  expect(screen.getByText('How do I create a dashboard?')).toBeInTheDocument();
  expect(screen.getByText(/placeholder response/)).toBeInTheDocument();
  // The composer clears after submitting
  expect(screen.getByRole('textbox', { name: 'Question' })).toHaveValue('');
});

test('does not submit an empty question', () => {
  render(<TutorialAssistant />);
  userEvent.click(screen.getByRole('button', { name: OPEN_LABEL }));
  expect(screen.getByRole('button', { name: 'Send question' })).toBeDisabled();
  expect(screen.queryByText(/placeholder response/)).not.toBeInTheDocument();
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
