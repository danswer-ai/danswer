import { ConnectorIndexingStatus } from "@/lib/types";
import { ConnectorTitle } from "@/components/admin/connectors/ConnectorTitle";
import { Badge } from "@/components/ui/badge";

interface ConnectorEditorProps {
  selectedCCPairIds: number[];
  setSetCCPairIds: (ccPairId: number[]) => void;
  allCCPairs: ConnectorIndexingStatus<any, any>[];
}

export const ConnectorEditor = ({
  selectedCCPairIds,
  setSetCCPairIds,
  allCCPairs,
}: ConnectorEditorProps) => {
  return (
    <div className="mb-3 flex gap-2 flex-wrap">
      {allCCPairs
        // remove public docs, since they don't make sense as part of a group
        .filter((ccPair) => !ccPair.public_doc)
        .map((ccPair) => {
          const ind = selectedCCPairIds.indexOf(ccPair.cc_pair_id);
          let isSelected = ind !== -1;
          return (
            <Badge
              key={`${ccPair.connector.id}-${ccPair.credential.id}`}
              className="cursor-pointer"
              variant={isSelected ? "default" : "outline"}
              onClick={() => {
                if (isSelected) {
                  setSetCCPairIds(
                    selectedCCPairIds.filter(
                      (ccPairId) => ccPairId !== ccPair.cc_pair_id
                    )
                  );
                } else {
                  setSetCCPairIds([...selectedCCPairIds, ccPair.cc_pair_id]);
                }
              }}
            >
              <ConnectorTitle
                connector={ccPair.connector}
                ccPairId={ccPair.cc_pair_id}
                ccPairName={ccPair.name}
                isLink={false}
                showMetadata={false}
              />
            </Badge>
          );
        })}
    </div>
  );
};
