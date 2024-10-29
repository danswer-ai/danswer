"use client";

import { ValidStatuses } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiMinus,
  FiPauseCircle,
} from "react-icons/fi";
import { HoverPopup } from "./HoverPopup";

export function IndexAttemptStatus({
  status,
  errorMsg,
}: {
  status: ValidStatuses | null;
  errorMsg?: string | null;
}) {
  let badge;

  if (status === "failed") {
    const icon = (
      <Badge color="red" icon={FiAlertTriangle}>
        Failed
      </Badge>
    );
    if (errorMsg) {
      badge = (
        <HoverPopup
          mainContent={<div className="cursor-pointer">{icon}</div>}
          popupContent={
            <div className="w-64 p-2 break-words overflow-hidden whitespace-normal">
              {errorMsg}
            </div>
          }
        />
      );
    } else {
      badge = icon;
    }
  } else if (status === "completed_with_errors") {
    const icon = (
      <Badge color="yellow" icon={FiAlertTriangle}>
        Completed with errors
      </Badge>
    );
    badge = (
      <HoverPopup
        mainContent={<div className="cursor-pointer">{icon}</div>}
        popupContent={
          <div className="w-64 p-2 break-words overflow-hidden whitespace-normal">
            The indexing attempt completed, but some errors were encountered
            during the rrun.
            <br />
            <br />
            Click View Errors for more details.
          </div>
        }
      />
    );
  } else if (status === "success") {
    badge = (
      <Badge color="green" icon={FiCheckCircle}>
        Succeeded
      </Badge>
    );
  } else if (status === "in_progress") {
    badge = (
      <Badge color="amber" icon={FiClock}>
        In Progress
      </Badge>
    );
  } else if (status === "not_started") {
    badge = (
      <Badge color="fuchsia" icon={FiClock}>
        Scheduled
      </Badge>
    );
  } else {
    badge = (
      <Badge color="gray" icon={FiMinus}>
        None
      </Badge>
    );
  }

  return <div>{badge}</div>;
}

export function CCPairStatus({
  status,
  disabled,
  isDeleting,
  size = "md",
}: {
  status: ValidStatuses;
  disabled: boolean;
  isDeleting: boolean;
  size?: "xs" | "sm" | "md" | "lg";
}) {
  let badge;

  if (isDeleting) {
    badge = (
      <Badge color="red" icon={FiAlertTriangle}>
        Deleting
      </Badge>
    );
  } else if (disabled) {
    badge = (
      <Badge color="yellow" icon={FiPauseCircle}>
        Paused
      </Badge>
    );
  } else if (status === "failed") {
    badge = (
      <Badge color="red" icon={FiAlertTriangle}>
        Error
      </Badge>
    );
  } else {
    badge = (
      <Badge color="green" icon={FiCheckCircle}>
        Active
      </Badge>
    );
  }

  return <div>{badge}</div>;
}
