import 'server-only';

import { createAI, createStreamableUI, getMutableAIState } from 'ai/rsc';
import OpenAI from 'openai';

import {
  spinner,
  BotCard,
  BotMessage,
  SystemMessage,
  Stock,
  Purchase,
  Stocks,
  Events,
} from '@/components/llm-stocks';

import {
  runAsyncFnWithoutBlocking,
  sleep,
  formatNumber,
  runOpenAICompletion,
} from '@/lib/utils';
import { z } from 'zod';
import { StockSkeleton } from '@/components/llm-stocks/stock-skeleton';
import { EventsSkeleton } from '@/components/llm-stocks/events-skeleton';
import { StocksSkeleton } from '@/components/llm-stocks/stocks-skeleton';
import { sendMessage } from './chat/lib';
import { BackendMessage, StreamingError } from './chat/interfaces';
import { AnswerPiecePacket } from '@/lib/search/interfaces';
import { OpenAIStream } from 'ai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

async function confirmPurchase(symbol: string, price: number, amount: number) {
  'use server';

  const aiState = getMutableAIState<typeof AI>();

  const purchasing = createStreamableUI(
    <div className="inline-flex items-start gap-1 md:items-center">
      {spinner}
      <p className="mb-2">
        Purchasing {amount} ${symbol}...
      </p>
    </div>
  );

  const systemMessage = createStreamableUI(null);

  runAsyncFnWithoutBlocking(async () => {
    // You can update the UI at any point.
    await sleep(1000);

    purchasing.update(
      <div className="inline-flex items-start gap-1 md:items-center">
        {spinner}
        <p className="mb-2">
          Purchasing {amount} ${symbol}... working on it...
        </p>
      </div>
    );

    await sleep(1000);

    purchasing.done(
      <div>
        <p className="mb-2">
          You have successfully purchased {amount} ${symbol}. Total cost:{' '}
          {formatNumber(amount * price)}
        </p>
      </div>
    );

    systemMessage.done(
      <SystemMessage>
        You have purchased {amount} shares of {symbol} at ${price}. Total cost ={' '}
        {formatNumber(amount * price)}.
      </SystemMessage>
    );

    aiState.done([
      ...aiState.get(),
      {
        role: 'system',
        content: `[User has purchased ${amount} shares of ${symbol} at ${price}. Total cost = ${
          amount * price
        }]`,
      },
    ]);
  });

  return {
    purchasingUI: purchasing.value,
    newMessage: {
      id: Date.now(),
      display: systemMessage.value,
    },
  };
}

async function submitUserMessage(content: string) {
  'use server';

  const aiState = getMutableAIState<typeof AI>();
  aiState.update([
    ...aiState.get(),
    {
      role: 'user',
      content,
    },
  ]);

  const reply = createStreamableUI(
    <BotMessage className="items-center">{spinner}</BotMessage>
  );

  const completion = runOpenAICompletion(openai, {
    model: 'gpt-3.5-turbo',
    stream: true,
    messages: [
      {
        role: 'system',
        content: `\
You are a Ask Ginetta conversation bot and you can help users find messages on Slack and ginetta website.

Messages inside [] means that it's a UI element or a user event. For example:
- "[Documents results ...]" means that a message is shown to the user with that information.

Besides that, you can also chat with users and do whatever is need to help a Ginetta employee to do their job.
Today is ${new Date().toLocaleDateString()} and the time is ${new Date().toLocaleTimeString()}.`,
      },
      ...aiState.get().map((info: any) => ({
        role: info.role,
        content: info.content,
        name: info.name,
      })),
    ],
    functions: [
      {
        name: 'weather',
        description: 'Get the weather in a location',
        parameters: z.object({
          location: z.string().describe('The location to get the weather for'),
        }),
      },
      {
        name: 'search_documents',
        description:
          'Retrieve documents based on a query. Use this to search for relevant documents or slack messages.',
        parameters: z.object({
          message: z
            .string()
            .describe(
              'The message is not structured query languages like SQL, but a natural language query. Use text that would likely be found in a slack message or document.'
            ),
          selectedDocumentIds: z.array(
            z
              .number()
              .describe(
                "List of db_doc_id's' to narrow down the search results. Use this to get more context about these specific documents."
              )
          ),
        }),
      },
    ],
    temperature: 0.2,
  });

  completion.onTextContent((content: string, isFinal: boolean) => {
    reply.update(<BotMessage>{content}</BotMessage>);
    if (isFinal) {
      reply.done();
      aiState.done([...aiState.get(), { role: 'assistant', content }]);
    }
  });

  completion.onFunctionCall(
    'weather',
    async ({ location }, appendFunctionCallMessage) => {
      console.log('==============================');
      console.log('Function calling: weather');

      reply.update(
        <BotCard>
          Getting the weather for {location} {spinner}
        </BotCard>
      );

      return appendFunctionCallMessage({
        temperature: (5 + 30 * Math.random()).toFixed(2),
      });
    }
  );
  completion.onFunctionCall(
    'search_documents',
    async ({ message }, appendFunctionCallMessage) => {
      console.log('==============================');
      console.log('Function calling: search_documents');
      console.log('message: ', message);
      // console.log("message: ", message);

      reply.update(<BotCard>{spinner}</BotCard>);

      // Fetch the api
      // const documentsMessage = await (await fetch("")).json();
      // let finalMessage: BackendMessage | null = null;

      let answer = '';
      for await (const packetBunch of sendMessage({
        message,
        queryOverride: message,
        parentMessageId: null,
        chatSessionId: 15,
        promptId: 4,
        filters: null,
        selectedDocumentIds: null,
      })) {
        for (const packet of packetBunch) {
          if (Object.hasOwn(packet, 'answer_piece')) {
            answer += (packet as AnswerPiecePacket).answer_piece;
          } else if (Object.hasOwn(packet, 'top_documents')) {
            // documents = (packet as DocumentsResponse).top_documents;
            // query = (packet as DocumentsResponse).rephrased_query;
            // retrievalType = RetrievalType.Search;
            // if (documents && documents.length > 0) {
            //   // point to the latest message (we don't know the messageId yet, which is why
            //   // we have to use -1)
            //   setSelectedMessageForDocDisplay(-1);
            // }
          } else if (Object.hasOwn(packet, 'error')) {
            const error = (packet as StreamingError).error;
            reply.done(<BotCard>{error}</BotCard>);

            aiState.done([
              ...aiState.get(),
              {
                role: 'function',
                name: 'search_documents',
                content: `[Error: ${error}]`,
              },
            ]);
            return appendFunctionCallMessage({ message: error });
          } else if (Object.hasOwn(packet, 'message_id')) {
            const finalMessage = packet as BackendMessage;
            reply.update(<BotCard>{finalMessage.message}</BotCard>);

            // Add citation to the AI state to allow the AI to know about when and who the citation was made.
            const citationsContext = Object.entries(
              finalMessage?.citations
            )?.map(([i, db_doc_id]) => {
              const foundDoc = finalMessage?.context_docs?.top_documents?.find(
                (doc) => doc.db_doc_id === db_doc_id
              );

              if (foundDoc) {
                return `Citation [${i}]: db_doc_id: ${foundDoc.db_doc_id}, ${foundDoc.semantic_identifier}
At: ${foundDoc.updated_at}`;
              }
            });
            console.log('citationsContext: ', citationsContext);

            aiState.update([
              ...aiState.get(),
              {
                role: 'function',
                name: 'search_documents',
                content: `[Documents results ${finalMessage.message}\n\n${citationsContext}]`,
              },
            ]);
            return appendFunctionCallMessage({
              message: finalMessage.message,
              citationsContext,
            });
          }

          reply.update(<BotCard>{answer}</BotCard>);
        }
      }
    }
  );

  return {
    id: Date.now(),
    display: reply.value,
  };
}

// Define necessary types and create the AI.

const initialAIState: {
  role: 'user' | 'assistant' | 'system' | 'function';
  content: string;
  id?: string;
  name?: string;
}[] = [];

const initialUIState: {
  id: number;
  display: React.ReactNode;
}[] = [];

export const AI = createAI({
  actions: {
    submitUserMessage,
    confirmPurchase,
  },
  initialUIState,
  initialAIState,
});
