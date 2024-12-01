export function ResultSearchIcon({ url }: { url: string }) {
  return (
    <img
      className="my-0 py-0"
      src={`https://www.google.com/s2/favicons?domain=${new URL(url).hostname}`}
      alt="favicon"
      height={18}
      width={18}
    />
  );
}
