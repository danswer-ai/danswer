"use client";

import React from "react";

export function HeaderTitle({
  children,
  onApplicationPage,
  backgroundToggled,
}: {
  children: JSX.Element | string;
  onApplicationPage?: boolean;
  backgroundToggled?: boolean;
}) {
  const isString = typeof children === "string";
  const textSize = isString && children.length > 10 ? "text-xl" : "text-2xl";

  return (
    <h1
      className={`${textSize} ${
        onApplicationPage
          ? backgroundToggled
            ? "text-text-sidebar-toggled-header"
            : "text-text-sidebar-header"
          : "text-text-header"
      } break-words line-clamp-2 ellipsis text-strong leading-none font-bold`}
    >
      {children}
    </h1>
  );
}
