#!/usr/bin/env node
/**
 * Computes a monotonically increasing Android versionCode for CI release builds.
 *
 * Why:
 * `frontend/app.json` pins a static `android.versionCode`. Google Play Console
 * rejects an upload whose versionCode is not strictly greater than the one
 * already published, so every build would collide after the first release.
 *
 * Strategy:
 *   1. Explicit override -- set the repository variable
 *      `AASAAN_ANDROID_VERSION_CODE` to take full manual control (useful when
 *      you need to match a version already on Play).
 *   2. Git-derived counter -- number of commits on the branch AFTER
 *      BASELINE_COMMIT. The first release build produces versionCode 1 and
 *      each later merge increments from there.
 *
 * Emits `versionCode=<n>` to the GITHUB_OUTPUT file when running in Actions,
 * and always prints a human-readable summary. No secret values are printed.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// The last commit on `main` before this CI change landed. Release builds count
// the commits that come after it, so the FIRST release build produces
// versionCode 1 and each subsequent one increments from there.
const BASELINE_COMMIT = 'b904420';

/**
 * Number of commits on `ref` that are NOT in BASELINE_COMMIT.
 * Returns null if the baseline cannot be resolved (e.g. shallow clone).
 */
function commitsSinceBaseline(ref) {
  try {
    execFileSync('git', ['cat-file', '-e', `${BASELINE_COMMIT}^{commit}`], { stdio: 'ignore' });
  } catch {
    return null;
  }
  try {
    const out = execFileSync('git', ['rev-list', '--count', `${BASELINE_COMMIT}..${ref}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const n = parseInt(out.trim(), 10);
    return Number.isInteger(n) && n >= 0 ? n : null;
  } catch {
    return null;
  }
}

function main() {
  const ref = process.env.GITHUB_SHA || 'HEAD';

  let versionCode;
  let source;

  // 1. Manual override wins over everything.
  const override = parseInt(process.env.AASAAN_ANDROID_VERSION_CODE || '', 10);
  if (Number.isInteger(override) && override > 0) {
    versionCode = override;
    source = 'AASAAN_ANDROID_VERSION_CODE variable (manual override)';
  } else {
    // 2. Count commits made after the baseline, so numbering starts at 1.
    const commits = commitsSinceBaseline(ref);
    if (commits !== null) {
      versionCode = commits;
      source = `commit count since ${BASELINE_COMMIT.slice(0, 7)} (${commits})`;
    } else {
      // 3. Fallback that is still monotonic within the workflow.
      const runNumber = parseInt(process.env.GITHUB_RUN_NUMBER || '0', 10);
      versionCode = 100000 + (Number.isInteger(runNumber) ? runNumber : 0);
      source = '100000 + run_number (baseline commit unavailable)';
    }
  }

  const versionName = '1.0.0';

  console.log(`[release-version] versionCode : ${versionCode}`);
  console.log(`[release-version] versionName : ${versionName}`);
  console.log(`[release-version] derived from: ${source}`);
  console.log(
    '[release-version] Google Play requires each upload to have a strictly ' +
      'greater versionCode than the last published one.'
  );

  const ghOutput = process.env.GITHUB_OUTPUT;
  if (ghOutput && fs.existsSync(path.dirname(ghOutput))) {
    fs.appendFileSync(ghOutput, `versionCode=${versionCode}\nversionName=${versionName}\n`);
  }
}

main();

