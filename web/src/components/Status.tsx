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

export function IndexAttemptStatus({
  status,
  errorMsg,
  size = "md",
}: {
  status: ValidStatuses;
  errorMsg?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
}) {
  let badge;

  if (status === "failed") {
    const icon = (
      <Badge variant="destructive">
        <TriangleAlert size={14} className="mr-0.5" /> Failed
      </Badge>
    );
    if (errorMsg) {
      badge = <CustomTooltip trigger={icon}>{errorMsg}</CustomTooltip>;
    } else {
      badge = icon;
    }
  } else if (status === "success") {
    badge = (
      <Badge variant="success">
        <CircleCheckBig size={14} className="mr-0.5" /> Succeeded
      </Badge>
    );
  } else if (status === "in_progress") {
    badge = (
      <Badge className="whitespace-nowrap">
        <Clock size={14} className="mr-0.5" /> In Progress
      </Badge>
    );
  } else if (status === "not_started") {
    badge = (
      <Badge variant="outline">
        <Clock size={14} className="mr-0.5" /> Scheduled
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
      <Badge variant="destructive">
        <TriangleAlert size={14} className="mr-0.5" /> Deleting
      </Badge>
    );
  } else if (disabled) {
    badge = (
      <Badge variant="secondary">
        <CirclePause size={14} className="mr-0.5" /> Paused
      </Badge>
    );
  } else if (status == "in_progress") {
    badge = (
      <Badge>
        <CirclePause size={14} className="mr-0.5" /> In Progress
      </Badge>
    );
  } else if (status === "failed") {
    badge = (
      <Badge variant="destructive">
        <TriangleAlert size={14} className="mr-0.5" /> Error
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
