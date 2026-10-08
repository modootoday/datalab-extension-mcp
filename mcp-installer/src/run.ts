export {
  detectHosts,
  filterByRequestedHosts,
  type DetectedHost,
} from "./run/detect.js";
export { runInstall } from "./run/install.js";
export { runUninstall } from "./run/uninstall.js";
export {
  cleanupLegacySkills,
  type LegacyCleanup,
} from "./run/legacy-skills.js";
