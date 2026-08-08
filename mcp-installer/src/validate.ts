/**
 * The gate every external value passes before it is interpolated into a CLI
 * argv or a config file.
 *
 * 🔴 These values reach shell commands and files we write, so the character
 * classes are deliberately narrow: no quoting scheme is trusted, the alphabet
 * itself is the safety argument. Widening one means re-auditing every sink.
 */
import type { RunOptions } from "./types.js";

export const TOKEN_RE = /^[0-9a-f]{32,128}$/i;
export const EXTENSION_ID_RE = /^[a-p]{32}$/;
export const PORT_RE = /^\d{2,5}$/;
export const VERSION_RE = /^\d+\.\d+\.\d+$/;

const RETRY_HINT = "패널에서 명령어를 다시 복사해서 실행해 주세요.";

export const INVALID_TOKEN_MESSAGE = `연결 토큰 형식이 올바르지 않아요. ${RETRY_HINT}`;
export const INVALID_EXTENSION_ID_MESSAGE = `확장 프로그램 ID 형식이 올바르지 않아요. ${RETRY_HINT}`;
export const INVALID_PORT_MESSAGE = `포트 번호 형식이 올바르지 않아요. ${RETRY_HINT}`;
export const INVALID_VERSION_MESSAGE = `버전 형식이 올바르지 않아요. ${RETRY_HINT}`;

/**
 * Install needs everything the config entry will contain. Returns the refusal
 * line to print, or null when every input is safe to use.
 */
export function validateInstallOptions(opts: RunOptions): string | null {
  if (typeof opts.version !== "string" || !VERSION_RE.test(opts.version)) {
    return INVALID_VERSION_MESSAGE;
  }
  if (typeof opts.token !== "string" || !TOKEN_RE.test(opts.token)) {
    return INVALID_TOKEN_MESSAGE;
  }
  if (
    typeof opts.extensionId !== "string" ||
    !EXTENSION_ID_RE.test(opts.extensionId)
  ) {
    return INVALID_EXTENSION_ID_MESSAGE;
  }
  if (opts.port !== undefined && !PORT_RE.test(opts.port)) {
    return INVALID_PORT_MESSAGE;
  }
  return null;
}

/**
 * Uninstall writes no credentials anywhere, so nothing is required — but
 * anything provided must still be well-formed, or it flows into diagnostics
 * unchecked.
 */
export function validateUninstallOptions(opts: RunOptions): string | null {
  if (
    opts.version !== undefined &&
    opts.version !== "" &&
    !VERSION_RE.test(opts.version)
  ) {
    return INVALID_VERSION_MESSAGE;
  }
  if (opts.token !== undefined && !TOKEN_RE.test(opts.token)) {
    return INVALID_TOKEN_MESSAGE;
  }
  if (
    opts.extensionId !== undefined &&
    !EXTENSION_ID_RE.test(opts.extensionId)
  ) {
    return INVALID_EXTENSION_ID_MESSAGE;
  }
  if (opts.port !== undefined && !PORT_RE.test(opts.port)) {
    return INVALID_PORT_MESSAGE;
  }
  return null;
}
