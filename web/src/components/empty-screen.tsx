import { Button } from '@/components/ui/button';
import { ExternalLink } from '@/components/external-link';
import { IconArrowRight } from '@/components/ui/icons';

const exampleMessages = [
  {
    heading: 'What\'s the weather in Lisbon and how comfortable do you think it is?',
    message: 'What\'s the weather in Lisbon and how comfortable do you think it is?',
  },
  {
    heading: "What's the weather in NYC?",
    message: "What's the weather in NYC?",
  },
  {
    heading: "When was bruno's parental leave?",
    message: "When was bruno's parental leave?",
  }
];

export function EmptyScreen({
  submitMessage,
}: {
  submitMessage: (message: string) => void;
}) {
  return (
    <div className="mx-auto max-w-2xl px-4">
      <div className="rounded-lg border bg-background p-8 mb-4">
        <h1 className="mb-2 text-lg font-semibold">
          Welcome to Power Chat Beta.
        </h1>
        <p className="mb-2 leading-normal text-muted-foreground">
          This is a demo of an interactive financial assistant.
        </p>
        <p className="mb-2 leading-normal text-muted-foreground">
          The demo is built with{' '}
          <ExternalLink href="https://nextjs.org">Next.js</ExternalLink> and the{' '}
          <ExternalLink href="https://sdk.vercel.ai/docs">
            Vercel AI SDK
          </ExternalLink>
          .
        </p>
        <p className="mb-2 leading-normal text-muted-foreground">
          It uses{' '}
          <ExternalLink href="https://vercel.com/blog/ai-sdk-3-generative-ui">
            React Server Components
          </ExternalLink>{' '}
          to combine text with UI generated as output of the LLM. The UI state
          is synced through the SDK so the model is aware of your interactions
          as they happen.
        </p>
        <p className="leading-normal text-muted-foreground">Try an example:</p>
        <div className="mt-4 flex flex-col items-start space-y-2 mb-4">
          {exampleMessages.map((message, index) => (
            <Button
              key={index}
              variant="link"
              className="h-auto p-0 text-base"
              onClick={async () => {
                submitMessage(message.message);
              }}
            >
              <IconArrowRight className="mr-2 text-muted-foreground" />
              {message.heading}
            </Button>
          ))}
        </div>
      </div>
      <p className="leading-normal text-muted-foreground text-[0.8rem] text-center max-w-96 ml-auto mr-auto">
        Note: Data and latency are simulated for illustrative purposes and
        should not be considered as financial advice.
      </p>
    </div>
  );
}
