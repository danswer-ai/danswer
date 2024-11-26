import { Main } from "./Main";

export default function Page({ params }: { params: { ccPairId: string } }) {
  const ccPairId = parseInt(params.ccPairId);

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="container">
        <Main ccPairId={ccPairId} />
      </div>
    </div>
  );
}
