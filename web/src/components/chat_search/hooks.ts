import { useUser } from "../user/UserProvider";
import { useRouter } from "next/navigation";
import { checkLlmProvider } from "../initialSetup/welcome/lib";
import { WellKnownLLMProviderDescriptor } from "@/app/admin/configuration/llm/interfaces";

import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";

interface UseSidebarVisibilityProps {
  toggledSidebar: boolean;
  sidebarElementRef: React.RefObject<HTMLElement>;
  showDocSidebar: boolean;
  setShowDocSidebar: Dispatch<SetStateAction<boolean>>;
  mobile?: boolean;
  setToggled?: () => void;
}

export const useSidebarVisibility = ({
  toggledSidebar,
  sidebarElementRef,
  setShowDocSidebar,
  setToggled,
  showDocSidebar,
  mobile,
}: UseSidebarVisibilityProps) => {
  const xPosition = useRef(0);

  useEffect(() => {
    const handleEvent = (event: MouseEvent) => {
      const currentXPosition = event.clientX;
      xPosition.current = currentXPosition;

      const sidebarRect = sidebarElementRef.current?.getBoundingClientRect();

      if (sidebarRect && sidebarElementRef.current) {
        const isWithinSidebar =
          currentXPosition >= sidebarRect.left &&
          currentXPosition <= sidebarRect.right &&
          event.clientY >= sidebarRect.top &&
          event.clientY <= sidebarRect.bottom;

        const sidebarStyle = window.getComputedStyle(sidebarElementRef.current);
        const isVisible = sidebarStyle.opacity !== "0";
        if (isWithinSidebar && isVisible) {
          if (!mobile) {
            setShowDocSidebar(true);
          }
        }

        if (mobile && !isWithinSidebar && setToggled) {
          setToggled();
          return;
        }

        if (
          currentXPosition > 100 &&
          showDocSidebar &&
          !isWithinSidebar &&
          !toggledSidebar
        ) {
          setTimeout(() => {
            setShowDocSidebar((showDocSidebar) => {
              // Account for possition as point in time of
              return !(xPosition.current > sidebarRect.right);
            });
          }, 200);
        } else if (currentXPosition < 100 && !showDocSidebar) {
          if (!mobile) {
            setShowDocSidebar(true);
          }
        }
      }
    };

    const handleMouseLeave = () => {
      setShowDocSidebar(false);
    };

    document.addEventListener("mousemove", handleEvent);
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      document.removeEventListener("mousemove", handleEvent);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [showDocSidebar, toggledSidebar, sidebarElementRef, mobile]);

  return { showDocSidebar };
};

export function useProviderStatus() {
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
  }, [router, user]);

  // don't show if
  //  (1) a valid provider has been setup or
  //  (2) there are no provider options (e.g. user isn't an admin)
  //  (3) (handled elsewhere) user explicitly hides the modal
  const shouldShowConfigurationNeeded =
    !validProviderExists && providerOptions.length > 0;

  return { shouldShowConfigurationNeeded, providerOptions };
}
