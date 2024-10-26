"use client";

import { ValidStatuses } from "@/lib/types";
import {
  TriangleAlert,
  CircleCheckBig,
  Clock,
  CirclePause,
} from "lucide-react";
import { Badge } from "./ui/badge";
import { CustomTooltip } from "./CustomTooltip";
import { HoverPopup } from "./HoverPopup";
import { FiAlertTriangle, FiMinus } from "react-icons/fi";

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
      <Badge variant="destructive">
        <TriangleAlert size={14} /> Failed
      </Badge>
    );
    if (errorMsg) {
      badge = <CustomTooltip trigger={icon}>{errorMsg}</CustomTooltip>;
    } else {
      badge = icon;
    }
  } else if (status === "completed_with_errors") {
    const icon = (
      <Badge variant="warning">
        <FiAlertTriangle />
        Completed with errors
      </Badge>
    );
    badge = (
      <HoverPopup
        mainContent={<div className="cursor-pointer">{icon}</div>}
        popupContent={
          <div className="w-64 p-2 overflow-hidden break-words whitespace-normal">
            The indexing attempt completed, but some errors were encountered
            during the run.
            <br />
            <br />
            Click View Errors for more details.
          </div>
        }
      />
    );
  } else if (status === "success") {
    badge = (
      <Badge variant="success">
        <CircleCheckBig size={14} /> Succeeded
      </Badge>
    );
  } else if (status === "in_progress") {
    badge = (
      <Badge className="whitespace-nowrap">
        <Clock size={14} /> In Progress
      </Badge>
    );
  } else if (status === "not_started") {
    badge = (
      <Badge variant="outline">
        <Clock size={14} /> Scheduled
      </Badge>
    );
  } else {
    badge = (
      <Badge variant="secondary">
        <FiMinus />
        None
      </Badge>
    );
  }

  return <>{badge}</>;
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
      <Badge variant="destructive">
        <TriangleAlert size={14} /> Deleting
      </Badge>
    );
  } else if (disabled) {
    badge = (
      <Badge variant="secondary">
        <CirclePause size={14} /> Paused
      </Badge>
    );
  } else if (status == "in_progress") {
    badge = (
      <Badge>
        <CirclePause size={14} /> In Progress
      </Badge>
    );
  } else if (status === "failed") {
    badge = (
      <Badge variant="destructive">
        <TriangleAlert size={14} /> Error
      </Badge>
    );
  } else {
    badge = (
      <Badge variant="success">
        <CircleCheckBig size={14} /> Active
      </Badge>
    );
  }

  return <div>{badge}</div>;
}
