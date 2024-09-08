import { WellKnownLLMProviderDescriptor } from "@/app/admin/configuration/llm/interfaces";
import { useEffect, useState } from "react";
import { checkLlmProvider } from "../initialSetup/welcome/lib";
import { useUser } from "../user/UserProvider";
import { useRouter } from "next/navigation";

export default function NoCredentialText({
  showConfigureAPIKey,
}: {
  showConfigureAPIKey: () => void;
}) {
  const { user } = useUser();
  const router = useRouter();
  const [validProviderExists, setValidProviderExists] = useState<boolean>(true);
  const [providerOptions, setProviderOptions] = useState<
    WellKnownLLMProviderDescriptor[]
  >([]);

  useEffect(() => {
    async function fetchProviderInfo() {
      const { providers, options, defaultCheckSuccessful } =
        await checkLlmProvider(user);
      setValidProviderExists(providers.length > 0 && defaultCheckSuccessful);
      setProviderOptions(options);
    }

    fetchProviderInfo();
  }, [router]);

  // don't show if
  //  (1) a valid provider has been setup or
  //  (2) there are no provider options (e.g. user isn't an admin)
  //  (3) user explicitly hides the modal
  if (validProviderExists || !providerOptions.length) {
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
