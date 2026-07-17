#!/usr/bin/env bash
#
# Licensed to the Apache Software Foundation (ASF) under one or more
# contributor license agreements.  See the NOTICE file distributed with
# this work for additional information regarding copyright ownership.
# The ASF licenses this file to You under the Apache License, Version 2.0
# (the "License"); you may not use this file except in compliance with
# the License.  You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# Regenerate the integration patch: the delta this project applies to core
# Superset (everything outside tutorial-assistant/). The patch documents the
# core touch points and is not used by the build; the widget and service live
# in-tree. Run from the repository root.
set -euo pipefail

BASE="${1:-v6.1}"
OUT="tutorial-assistant/patches/tutorial-assistant-integration.patch"

# Core Superset files the integration touches.
FILES=(
  "superset-frontend/src/views/App.tsx"
  "superset-frontend/packages/superset-ui-core/src/utils/featureFlags.ts"
  "superset-frontend/src/types/bootstrapTypes.ts"
  "docker/pythonpath_dev/superset_config.py"
  "docker-compose.yml"
)

mkdir -p "$(dirname "$OUT")"
git diff "${BASE}...HEAD" -- "${FILES[@]}" > "$OUT"
echo "Wrote $OUT ($(wc -l < "$OUT") lines) against base ${BASE}."
echo "Verify it applies cleanly to a pristine ${BASE}:"
echo "  git worktree add /tmp/ta-verify ${BASE}"
echo "  git -C /tmp/ta-verify apply --check $(pwd)/${OUT}"
