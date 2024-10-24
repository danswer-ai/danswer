import { useProviderStatus } from "./ProviderContext";

export default function CredentialNotConfigured({
  showConfigureAPIKey,
  noSources,
}: {
  showConfigureAPIKey: () => void;
  noSources: boolean;
}) {
  const { shouldShowConfigurationNeeded } = useProviderStatus();

  if (!shouldShowConfigurationNeeded) {
    return null;
  }

  return (
    <>
      {noSources ? (
        <p className="text-base text-center w-full text-subtle">
          You have not yet added any sources. Please add{" "}
          <a
            href="/admin/add-connector"
            className="text-link hover:underline cursor-pointer"
          >
            some sources
          </a>{" "}
          to continue.
        </p>
      ) : (
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
      )}
    </>
  );
}
