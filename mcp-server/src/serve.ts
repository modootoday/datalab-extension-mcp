#!/usr/bin/env node
/**
 * The daemon's process entry point — the file an adapter spawns.
 *
 * 🔴 No exports, ever. The bundler tree-shakes a top-level side effect out of
 * a module that also exports something, and this file's one statement is that
 * side effect. Adding an export would leave a spawned daemon starting nothing.
 */
import { runDaemon } from "./daemon.js";

runDaemon(process.env);
