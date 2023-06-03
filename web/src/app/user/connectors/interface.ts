import { PopupSpec } from "@/components/admin/connectors/Popup";
import { Connector, Credential } from "@/lib/types";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context";
import { ScopedMutator } from "swr/_internal";

export interface CardProps {
  connector: Connector<{}> | null | undefined;
  userCredentials: Credential<any>[] | null | undefined;
  setPopup: (popup: PopupSpec | null) => void;
  router: AppRouterInstance;
  mutate: ScopedMutator;
}
