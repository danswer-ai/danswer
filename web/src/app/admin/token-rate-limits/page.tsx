"use client";

import { AdminPageTitle } from "@/components/admin/Title";
import { useState } from "react";
import {
  insertGlobalTokenRateLimit,
  insertGroupTokenRateLimit,
  insertUserTokenRateLimit,
} from "./lib";
import { Scope, TokenRateLimit } from "./types";
import { GenericTokenRateLimitTable } from "./TokenRateLimitTables";
import { mutate } from "swr";
import { CreateRateLimitModal } from "./CreateRateLimitModal";
import { usePaidEnterpriseFeaturesEnabled } from "@/components/settings/usePaidEnterpriseFeaturesEnabled";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, Shield, User, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CustomModal } from "@/components/CustomModal";
import { Button } from "@/components/ui/button";

const BASE_URL = "/api/admin/token-rate-limits";
const GLOBAL_TOKEN_FETCH_URL = `${BASE_URL}/global`;
const USER_TOKEN_FETCH_URL = `${BASE_URL}/users`;
const TEAMSPACE_FETCH_URL = `${BASE_URL}/teamspaces`;

const GLOBAL_DESCRIPTION =
  "Global rate limits apply to all users, teamspaces, and API keys. When the global \
  rate limit is reached, no more tokens can be spent.";
const USER_DESCRIPTION =
  "User rate limits apply to individual users. When a user reaches a limit, they will \
  be temporarily blocked from spending tokens.";
const TEAMSPACE_DESCRIPTION =
  "Teamspace rate limits apply to all users in a group. When a group reaches a limit, \
  all users in the group will be temporarily blocked from spending tokens, regardless \
  of their individual limits. If a user is in multiple groups, the most lenient limit \
  will apply.";

const handleCreateTokenRateLimit = async (
  target_scope: Scope,
  period_hours: number,
  token_budget: number,
  team_id: number = -1
) => {
  const tokenRateLimitArgs = {
    enabled: true,
    token_budget: token_budget,
    period_hours: period_hours,
  };

  if (target_scope === Scope.GLOBAL) {
    return await insertGlobalTokenRateLimit(tokenRateLimitArgs);
  } else if (target_scope === Scope.USER) {
    return await insertUserTokenRateLimit(tokenRateLimitArgs);
  } else if (target_scope === Scope.TEAMSPACE) {
    return await insertGroupTokenRateLimit(tokenRateLimitArgs, team_id);
  } else {
    throw new Error(`Invalid target_scope: ${target_scope}`);
  }
};

function Main() {
  const [tabIndex, setTabIndex] = useState(0);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const { toast } = useToast();

  const isPaidEnterpriseFeaturesEnabled = usePaidEnterpriseFeaturesEnabled();

  const updateTable = (target_scope: Scope) => {
    if (target_scope === Scope.GLOBAL) {
      mutate(GLOBAL_TOKEN_FETCH_URL);
      setTabIndex(0);
    } else if (target_scope === Scope.USER) {
      mutate(USER_TOKEN_FETCH_URL);
      setTabIndex(1);
    } else if (target_scope === Scope.TEAMSPACE) {
      mutate(TEAMSPACE_FETCH_URL);
      setTabIndex(2);
    }
  };

  const handleSubmit = (
    target_scope: Scope,
    period_hours: number,
    token_budget: number,
    team_id: number = -1
  ) => {
    handleCreateTokenRateLimit(
      target_scope,
      period_hours,
      token_budget,
      team_id
    )
      .then(() => {
        setModalIsOpen(false);
        toast({
          title: "Success",
          description: "Token rate limit created!",
          variant: "success",
        });
        updateTable(target_scope);
      })
      .catch((error) => {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      });
  };

  return (
    <div>
      <p className="mb-2">
        Token rate limits enable you control how many tokens can be spent in a
        given time period. With token rate limits, you can:
      </p>

      <ul className="list-disc mt-2 ml-4 mb-2">
        <li>
          Set a global rate limit to control your organization&apos;s overall
          token spend.
        </li>
        {isPaidEnterpriseFeaturesEnabled && (
          <>
            <li>
              Set rate limits for users to ensure that no single user can spend
              too many tokens.
            </li>
            <li>
              Set rate limits for teamspaces to control token spend for your
              teams.
            </li>
          </>
        )}
        <li>Enable and disable rate limits on the fly.</li>
      </ul>

      <CreateRateLimitModal
        onSubmit={handleSubmit}
        forSpecificScope={
          isPaidEnterpriseFeaturesEnabled ? undefined : Scope.GLOBAL
        }
        isOpen={modalIsOpen}
        setIsOpen={setModalIsOpen}
      />

      {isPaidEnterpriseFeaturesEnabled && (
        <Tabs
          value={tabIndex.toString()}
          onValueChange={(value) => setTabIndex(Number(value))}
          className="mt-6"
        >
          <TabsList className="border-b border-gray-200">
            <TabsTrigger value="0">
              <Globe size={16} className="mr-2" />
              Global
            </TabsTrigger>
            <TabsTrigger value="1">
              <User size={16} className="mr-2" />
              User
            </TabsTrigger>
            <TabsTrigger value="2">
              <Users size={16} className="mr-2" />
              Teamspaces
            </TabsTrigger>
          </TabsList>
          <TabsContent value="0" className="mt-6">
            <GenericTokenRateLimitTable
              fetchUrl={GLOBAL_TOKEN_FETCH_URL}
              title={"Global Token Rate Limits"}
              description={GLOBAL_DESCRIPTION}
            />
          </TabsContent>
          <TabsContent value="1" className="mt-6">
            <GenericTokenRateLimitTable
              fetchUrl={USER_TOKEN_FETCH_URL}
              title={"User Token Rate Limits"}
              description={USER_DESCRIPTION}
            />
          </TabsContent>
          <TabsContent value="2" className="mt-6">
            <GenericTokenRateLimitTable
              fetchUrl={TEAMSPACE_FETCH_URL}
              title={"Teamspace Token Rate Limits"}
              description={TEAMSPACE_DESCRIPTION}
              responseMapper={(data: Record<string, TokenRateLimit[]>) =>
                Object.entries(data).flatMap(([group_name, elements]) =>
                  elements.map((element) => ({
                    ...element,
                    group_name,
                  }))
                )
              }
            />
          </TabsContent>
        </Tabs>
      )}

      {!isPaidEnterpriseFeaturesEnabled && (
        <div className="mt-6">
          <GenericTokenRateLimitTable
            fetchUrl={GLOBAL_TOKEN_FETCH_URL}
            title={"Global Token Rate Limits"}
            description={GLOBAL_DESCRIPTION}
          />
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <div className="py-24 md:py-32 lg:pt-16">
      <AdminPageTitle title="Token Rate Limits" icon={<Shield size={32} />} />

      <Main />
    </div>
  );
}
