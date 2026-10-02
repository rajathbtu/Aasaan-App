#!/usr/bin/env node
/**
 * Computes a monotonically increasing Android versionCode for CI release builds.
 *
 * Why:
 * `frontend/app.json` pins a static `android.versionCode`. Google Play Console
 * rejects an upload whose versionCode is not strictly greater than the one
 * already published, so every build would collide after the first release.
 *
 * Strategy (in order of preference):
 *   1. EAS remote version -- used if `eas build:version:get` succeeds and
 *      `eas.json` has `appVersionSource: "remote"`. This is the source of truth
 *      once the app is published through EAS.
 *   2. Git-derived counter  -- `1000 + <number of commits reachable from the
 *      built ref>`. This is strictly increasing along the branch history, so
 *      every commit on main yields a higher versionCode than its ancestors, and
 *      it is far above the hand-maintained app.json values (currently 3) so it
 *      can never regress below a previously published build.
 *
 * Emits `versionCode=<n>` to the GITHUB_OUTPUT file when running in Actions,
 * and always prints a human-readable summary. No secrets are read or printed.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ANDROID_VERSION_CODE_BASE = 1000;

function gitCommitCount(ref) {
  try {
    const out = execFileSync('git', ['rev-list', '--count', ref], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const n = parseInt(out.trim(), 10);
    return Number.isInteger(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

function easRemoteVersion() {
  // Opt-in only. `eas build:version:get` needs EAS credentials and a network
  // round-trip, so it is skipped unless EXPO_TOKEN is present in the
  // environment. This keeps the default CI path fast and dependency-free.
  if (!process.env.EXPO_TOKEN || process.env.AASAAN_USE_EAS_VERSION === 'false') {
    return null;
  }
  // `eas.json` sets appVersionSource: "remote". If the call fails (not logged
  // in, not linked yet, etc.) we fall back to the git-derived counter.
  try {
    const out = execFileSync(
      'npx',
      ['--yes', 'eas-cli', 'build:version:get', '--platform', 'android', '--non-interactive'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 120000 }
    );
    const m = out.match(/versionCode[:=\s]+(\d+)/i) || out.match(/\b(\d{3,})\b/);
    return m ? parseInt(m[1], 10) : null;
  } catch {
    return null;
  }
}

function main() {
  const ref = process.env.GITHUB_SHA || 'HEAD';
  const base = ANDROID_VERSION_CODE_BASE;

  let versionCode;
  let source;

  const eas = easRemoteVersion();
  if (eas) {
    // Bump so this build is strictly greater than what EAS last recorded.
    versionCode = eas + 1;
    source = `EAS remote versionCode (${eas}) + 1`;
  } else {
    const commits = gitCommitCount(ref);
    if (commits) {
      versionCode = base + commits;
      source = `${base} + commit count (${commits}) for ${ref.slice(0, 7)}`;
    } else {
      // Last resort: still monotonic within a workflow run via run_number.
      const runNumber = parseInt(process.env.GITHUB_RUN_NUMBER || '0', 10);
      versionCode = base + 100000 + (Number.isInteger(runNumber) ? runNumber : 0);
      source = `${base} + 100000 + run_number (git unavailable)`;
    }
  }

  const versionName = process.env.GITHUB_REF_NAME
    ? `${process.env.GITHUB_REF_NAME}-${process.env.GITHUB_SHA.slice(0, 7)}`
    : 'ci';

  console.log(`[release-version] versionCode : ${versionCode}`);
  console.log(`[release-version] derived from: ${source}`);
  console.log(`[release-version] versionName : ${versionName}`);
  console.log(
    '[release-version] NOTE: confirm this versionCode is greater than the last ' +
      'one published in Play Console before the first upload.'
  );

  const ghOutput = process.env.GITHUB_OUTPUT;
  if (ghOutput && fs.existsSync(path.dirname(ghOutput))) {
    fs.appendFileSync(ghOutput, `versionCode=${versionCode}\nversionName=${versionName}\n`);
  }
}

main();
