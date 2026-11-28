/** Refuses to send calls to a connector port another OS account holds. */
export {
  PORT_HELD_MESSAGE,
  PortHeldByOtherAccount,
  createListenerGuard,
  type ListenerGuard,
} from "./guard.js";
export {
  lsofListenerPids,
  measureListener,
  procListeners,
  type ListenerMeasure,
  type MeasureDeps,
} from "./measure.js";
export { systemMeasureDeps } from "./system.js";
