"use client";

import { errorHandlingFetcher, RedirectError } from "@/lib/fetcher";
import useSWR from "swr";
import { CustomModal } from "../CustomModal";
import { Button } from "../ui/button";
import { useEffect, useState } from "react";
import { CircleAlert } from "lucide-react";
import { User } from "@/lib/types";
import { getSecondsUntilExpiration } from "@/lib/time";
import { CUSTOM_REFRESH_URL } from "@/lib/constants";
import { refreshToken } from "./refreshUtils";

export const HealthCheckBanner = () => {
  const { error } = useSWR("/api/health", errorHandlingFetcher);
  const [expired, setExpired] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(true);

  const [secondsUntilExpiration, setSecondsUntilExpiration] = useState<
    number | null
  >(null);
  const { data: user, mutate: mutateUser } = useSWR<User>(
    "/api/me",
    errorHandlingFetcher
  );

  const updateExpirationTime = async () => {
    const updatedUser = await mutateUser();

    if (updatedUser) {
      const seconds = getSecondsUntilExpiration(updatedUser);
      setSecondsUntilExpiration(seconds);
      console.debug(`Updated seconds until expiration:! ${seconds}`);
    }
  };

  useEffect(() => {
    updateExpirationTime();
  }, [user]);

  useEffect(() => {
    if (CUSTOM_REFRESH_URL) {
      const refreshUrl = CUSTOM_REFRESH_URL;
      let refreshTimeoutId: NodeJS.Timeout;
      let expireTimeoutId: NodeJS.Timeout;

      const attemptTokenRefresh = async () => {
        try {
          // NOTE: This is a mocked refresh token for testing purposes.
          // const refreshTokenData = mockedRefreshToken();

          const refreshTokenData = await refreshToken(refreshUrl);

          const response = await fetch("/api/workspace/refresh-token", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(refreshTokenData),
          });
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          await new Promise((resolve) => setTimeout(resolve, 4000));

          await mutateUser(undefined, { revalidate: true });
          updateExpirationTime();
        } catch (error) {
          console.error("Error refreshing token:", error);
        }
      };

      const scheduleRefreshAndExpire = () => {
        if (secondsUntilExpiration !== null) {
          const timeUntilRefresh = (secondsUntilExpiration + 0.5) * 1000;
          refreshTimeoutId = setTimeout(attemptTokenRefresh, timeUntilRefresh);

          const timeUntilExpire = (secondsUntilExpiration + 10) * 1000;
          expireTimeoutId = setTimeout(() => {
            console.debug("Session expired. Setting expired state to true.");
            setExpired(true);
          }, timeUntilExpire);
        }
      };

      scheduleRefreshAndExpire();

      return () => {
        clearTimeout(refreshTimeoutId);
        clearTimeout(expireTimeoutId);
      };
    }
  }, [secondsUntilExpiration, user]);

  if (!error && !expired) {
    return null;
  }

  console.debug(
    `Rendering HealthCheckBanner. Error: ${error}, Expired: ${expired}`
  );

  if (error instanceof RedirectError || expired) {
    return (
      <CustomModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        trigger={null}
        title="You have been logged out!"
      >
        <div className="flex flex-col gap-y-4">
          <p className="text-lg pb-4">
            You can click &quot;Log in&quot; to log back in! Apologies for the
            inconvenience.
          </p>
          <Button className="mx-auto">
            <a href="/auth/login">Log in</a>
          </Button>
        </div>
      </CustomModal>
    );
  } else {
    return (
      <div className="text-sm bg-destructive-500 p-3 rounded-xs border-hidden flex gap-2 m-1.5 mb-0 z-loading relative">
        <CircleAlert size={20} className="shrink-0" />
        <p className="font-bold">The backend is currently unavailable.</p>

        <p className="ml-2">
          If this is your initial setup or you just updated your Arnold AI
          deployment, this is likely because the backend is still starting up.
          Give it a minute or two, and then refresh the page. If that does not
          work, make sure the backend is setup and/or contact an administrator.
        </p>
      </div>
    );
  }
};
