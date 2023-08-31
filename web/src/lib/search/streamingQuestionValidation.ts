import { AnswerPiece, ValidQuestionResponse } from "./interfaces";
import { processRawChunkString } from "./streamingUtils";

export interface QuestionValidationArgs {
  query: string;
  update: (update: Partial<ValidQuestionResponse>) => void;
}

export const questionValidationStreamed = async <T>({
  query,
  update,
}: QuestionValidationArgs) => {
  const response = await fetch("/api/stream-query-validation", {
    method: "POST",
    body: JSON.stringify({
      query,
      collection: "danswer_index",
      use_keyword: null,
      filters: null,
      offset: null,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });
  const reader = response.body?.getReader();
  const decoder = new TextDecoder("utf-8");

  let reasoning = "";
  let previousPartialChunk: string | null = null;
  while (true) {
    const rawChunk = await reader?.read();
    if (!rawChunk) {
      throw new Error("Unable to process chunk");
    }
    const { done, value } = rawChunk;
    if (done) {
      break;
    }

    const [completedChunks, partialChunk] = processRawChunkString<
      AnswerPiece | ValidQuestionResponse
    >(decoder.decode(value, { stream: true }), previousPartialChunk);
    if (!completedChunks.length && !partialChunk) {
      break;
    }
    previousPartialChunk = partialChunk as string | null;

    completedChunks.forEach((chunk) => {
      if (Object.hasOwn(chunk, "answer_piece")) {
        reasoning += (chunk as AnswerPiece).answer_piece;
        update({
          reasoning,
        });
      }

      if (Object.hasOwn(chunk, "answerable")) {
        update({ answerable: (chunk as ValidQuestionResponse).answerable });
      }
    });
  }
};
