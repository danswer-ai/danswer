import { Citation } from "@/components/search/results/Citation";
import React, { memo, useRef } from "react";

export const MemoizedLink = memo((props: any) => {
  const count = useRef(0);
  console.log("link", count.current);
  count.current++;

  const { node, ...rest } = props;
  const value = rest.children;

  if (value?.toString().startsWith("*")) {
    return (
      <div className="flex-none bg-background-800 inline-block rounded-full h-3 w-3 ml-2" />
    );
  } else if (value?.toString().startsWith("[")) {
    return <Citation link={rest?.href}>{rest.children}</Citation>;
  } else {
    return (
      <a
        onMouseDown={() =>
          rest.href ? window.open(rest.href, "_blank") : undefined
        }
        className="cursor-pointer text-link hover:text-link-hover"
      >
        {rest.children}
      </a>
    );
  }
});

export const MemoizedParagraph = memo(({ content }: { content: string }) => {
  const count = useRef(0);
  console.log("paragraph", count.current);
  count.current++;

  return <p className="text-default">{content}</p>;
});

MemoizedLink.displayName = "MemoizedLink";
MemoizedParagraph.displayName = "MemoizedParagraph";
