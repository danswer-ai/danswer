import faviconFetch from "favicon-fetch";
import { SourceIcon } from "./SourceIcon";

export function SearchResultIcon({ url }: { url: string }) {
  console.log("search result icon", url);
  const faviconUrl = faviconFetch({ uri: url });
  console.log("search resultD");
  if (!faviconUrl) {
    return <SourceIcon sourceType="web" iconSize={18} />;
  }
  console.log("faviconUrl", faviconUrl);
  console.log(faviconUrl);
  return (
    <div className="rounded-full w-[18px] h-[18px] overflow-hidden bg-gray-200">
      <img
        height={18}
        width={18}
        className="rounded-full w-full h-full object-cover"
        src={faviconUrl}
        alt="favicon"
        onError={(e) => {
          e.currentTarget.onerror = null;
        }}
      />
    </div>
  );
}
