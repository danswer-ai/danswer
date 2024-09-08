import { useProviderStatus } from "./hooks";

export default function NoCredentialText({
  showConfigureAPIKey,
}: {
  showConfigureAPIKey: () => void;
}) {
  const { shouldShowConfigurationNeeded } = useProviderStatus();

  if (!shouldShowConfigurationNeeded) {
    return null;
  }

  return (
    <p className="text-base text-center w-full text-subtle">
      Please note that you have not yet configured an LLM provider. You can
      configure one{" "}
      <button
        onClick={showConfigureAPIKey}
        className="text-link hover:underline cursor-pointer"
      >
        here
      </button>
      .
    </p>
  );
}
