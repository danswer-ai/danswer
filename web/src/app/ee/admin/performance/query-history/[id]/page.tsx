import { Bold, Text, Card, Title, Divider } from "@tremor/react";
import { QuerySnapshot } from "../../analytics/types";
import { buildUrl } from "@/lib/utilsSS";
import { BackButton } from "./BackButton";
import { FiBook } from "react-icons/fi";
import { processCookies } from "@/lib/userSS";
import { cookies } from "next/headers";

export default async function QueryPage({
  params,
}: {
  params: { id: string };
}) {
  const response = await fetch(buildUrl(`/admin/query-history/${params.id}`), {
    next: { revalidate: 0 },
    headers: {
      cookie: processCookies(cookies()),
    },
  });
  const queryEvent = (await response.json()) as QuerySnapshot;

  return (
    <main className="pt-4 mx-auto container dark">
      <BackButton />

      <Card className="mt-4">
        <Title>Query Details</Title>

        <Divider />

        <div className="flex flex-col gap-y-3">
          <div>
            <Bold>Query</Bold>
            <Text className="flex flex-wrap whitespace-normal mt-1">
              {queryEvent.query}
            </Text>
          </div>

          <div>
            <Bold>Answer</Bold>
            <Text className="flex flex-wrap whitespace-normal mt-1">
              {queryEvent.llm_answer}
            </Text>
          </div>

          <div>
            <Bold>Retrieved Documents</Bold>
            <div className="flex flex-col gap-y-2 mt-1">
              {queryEvent.retrieved_documents?.map((document) => {
                return (
                  <Text className="flex" key={document.document_id}>
                    <FiBook
                      className={
                        "my-auto mr-1" +
                        (document.link ? " text-blue-500" : " ")
                      }
                    />
                    {document.link ? (
                      <a
                        href={document.link}
                        target="_blank"
                        className="text-blue-500"
                      >
                        {document.semantic_identifier}
                      </a>
                    ) : (
                      document.semantic_identifier
                    )}
                  </Text>
                );
              })}
            </div>
          </div>
        </div>
      </Card>
    </main>
  );
}
