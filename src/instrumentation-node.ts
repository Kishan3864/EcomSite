import { setDefaultAutoSelectFamily, setDefaultAutoSelectFamilyAttemptTimeout } from "node:net";

/**
 * Happy Eyeballs, in its own file because it reaches for a Node socket API and
 * `instrumentation.ts` is also loaded by the edge runtime, which has none.
 * Only the Node runtime ever imports this.
 */
export function enableHappyEyeballs() {
  setDefaultAutoSelectFamily(true);
  // Node's default is 250ms. Half a second is kinder to a slow-but-working
  // first family, and still far below anything a person would notice.
  setDefaultAutoSelectFamilyAttemptTimeout(500);
}
