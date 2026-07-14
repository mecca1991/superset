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
import { useLocation } from 'react-router-dom';
import { TutorialContext, TutorialRouteContext } from './types';

const MAX_VIZ_TYPE_LENGTH = 50;

export function routeContextFor(pathname: string): TutorialRouteContext {
  if (pathname.startsWith('/superset/dashboard/')) {
    return 'dashboard';
  }
  if (
    pathname.startsWith('/explore/') ||
    pathname.startsWith('/superset/explore/')
  ) {
    return 'explore';
  }
  if (pathname.startsWith('/sqllab/')) {
    return 'sqllab';
  }
  if (
    pathname.startsWith('/chart/list/') ||
    pathname.startsWith('/dashboard/list/')
  ) {
    return 'list';
  }
  return 'other';
}

/**
 * Best-effort viz_type without coupling to Explore's Redux store: on Explore
 * routes it is present as a URL query parameter. Its absence never blocks a
 * request.
 */
function readVizType(
  route: TutorialRouteContext,
  search: string,
): string | undefined {
  if (route !== 'explore') {
    return undefined;
  }
  const vizType = new URLSearchParams(search).get('viz_type');
  if (!vizType) {
    return undefined;
  }
  return vizType.slice(0, MAX_VIZ_TYPE_LENGTH);
}

/**
 * Derives the small, read-only page context sent with each question
 * (spec section 4.3). No chart data, SQL, or Redux state is included.
 */
export function useRouteContext(): TutorialContext {
  const location = useLocation();
  const route = routeContextFor(location.pathname);
  const vizType = readVizType(route, location.search);
  return vizType ? { route, viz_type: vizType } : { route };
}
