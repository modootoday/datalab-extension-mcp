#!/usr/bin/env node
/**
 * The daemon's process entry point — this is the file an adapter spawns
 * (`process.execPath <this>`), and what `mcp serve` runs.
 *
 * It has NO exports on purpose. A module that exports something and also has a
 * top-level side effect gets that side effect tree-shaken out by tsup/esbuild
 * (it happened: `daemon.ts` exported runDaemon AND had an `if (isDirectRun())`
 * call, and the built file dropped the call — a spawned daemon started
 * nothing). With no exports, this file is a pure entry and its one statement
 * survives the build. Keep it that way: do not add an export here.
 */
import { runDaemon } from "./daemon.js";

runDaemon(process.env);
