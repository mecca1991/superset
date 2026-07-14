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

/**
 * Error codes shared between the tutorial assistant service, the widget,
 * and their tests.
 */
export enum TutorialAssistantErrorCode {
  Validation = 'VALIDATION',
  ModelUnavailable = 'MODEL_UNAVAILABLE',
  Timeout = 'TIMEOUT',
}

export type TutorialMessageRole = 'user' | 'assistant';

/** Lifecycle of an assistant answer as it streams in. */
export type TutorialMessageStatus = 'streaming' | 'done' | 'stopped' | 'error';

export interface TutorialMessage {
  id: string;
  role: TutorialMessageRole;
  content: string;
  /** Present on assistant messages; absent on user messages. */
  status?: TutorialMessageStatus;
  /** Set when status is 'error'. */
  errorCode?: TutorialAssistantErrorCode;
}

/** Page context sent with each question, derived from the current route. */
export type TutorialRouteContext =
  | 'dashboard'
  | 'explore'
  | 'sqllab'
  | 'list'
  | 'other';

export interface TutorialContext {
  route: TutorialRouteContext;
  viz_type?: string;
}

export interface TutorialHistoryEntry {
  role: TutorialMessageRole;
  content: string;
}
