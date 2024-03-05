import { cookies } from "next/headers";
import {
  _CompletedWelcomeFlowDummyComponent,
  _WelcomeModal,
} from "./WelcomeModal";
import { COMPLETED_WELCOME_FLOW_COOKIE } from "./constants";

export function hasCompletedWelcomeFlowSS() {
  const cookieStore = cookies();
  return (
    cookieStore.get(COMPLETED_WELCOME_FLOW_COOKIE)?.value?.toLowerCase() ===
    "true"
  );
}

export function WelcomeModal() {
  const hasCompletedWelcomeFlow = hasCompletedWelcomeFlowSS();
  if (hasCompletedWelcomeFlow) {
    return <_CompletedWelcomeFlowDummyComponent />;
  }

  return <_WelcomeModal />;
}
