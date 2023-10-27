"use client";

import { ValidStatuses } from "@/lib/types";
import { Badge } from "@tremor/react";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiPauseCircle,
} from "react-icons/fi";

export function IndexAttemptStatus({
  status,
  size = "md",
}: {
  status: ValidStatuses;
  size?: "xs" | "sm" | "md" | "lg";
}) {
  let badge;

  if (status === "failed") {
    badge = (
      <Badge size={size} color="red" icon={FiAlertTriangle}>
        Failed
      </Badge>
    );
  } else if (status === "success") {
    badge = (
      <Badge size={size} color="green" icon={FiCheckCircle}>
        Succeeded
      </Badge>
    );
  } else if (status === "in_progress" || status === "not_started") {
    badge = (
      <Badge size={size} color="green" icon={FiClock}>
        In Progress
      </Badge>
    );
  } else {
    badge = (
      <Badge size={size} color="yellow" icon={FiClock}>
        Initializing
      </Badge>
    );
  }

  // TODO: remove wrapping `dark` once we have light/dark mode
  return <div className="dark">{badge}</div>;
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
      <Badge size={size} color="red" icon={FiAlertTriangle}>
        Deleting
      </Badge>
    );
  } else if (disabled) {
    badge = (
      <Badge size={size} color="yellow" icon={FiPauseCircle}>
        Disabled
      </Badge>
    );
  } else if (status === "failed") {
    badge = (
      <Badge size={size} color="red" icon={FiAlertTriangle}>
        Error
      </Badge>
    );
  } else {
    badge = (
      <Badge size={size} color="green" icon={FiCheckCircle}>
        Running
      </Badge>
    );
  }

  // TODO: remove wrapping `dark` once we have light/dark mode
  return <div className="dark">{badge}</div>;
}
