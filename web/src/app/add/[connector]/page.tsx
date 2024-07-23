import WrappedPage from "./Wrapper";

export default async function Page({
  params,
}: {
  params: { connector: string };
}) {
  return <WrappedPage connector={params.connector} />;
}
