import React, { useEffect, useState } from "react";
import useSWR from "swr";
import { Persona } from "@/app/admin/assistants/interfaces";
import {
  Notification,
  NotificationType,
} from "@/app/admin/settings/interfaces";
import { errorHandlingFetcher } from "@/lib/fetcher";
import { AssistantIcon } from "@/components/assistants/AssistantIcon";
import { addAssistantToList } from "@/lib/assistants/updateAssistantPreferences";
import { useChatContext } from "../context/ChatContext";
import { useAssistants } from "../context/AssisantsContext";
import { useUser } from "../user/UserProvider";

export const NotificationCard = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const {
    data: notifications,
    error,
    mutate: refreshNotifications,
  } = useSWR<Notification[]>("/api/notifications", errorHandlingFetcher);
  const { refreshAssistants } = useAssistants();

  const { refreshUser } = useUser();
  const [personas, setPersonas] = useState<Record<number, Persona>>({});

  useEffect(() => {
    const fetchPersonas = async () => {
      if (notifications) {
        const personaIds = notifications
          .filter(
            (n) =>
              n.notif_type.toLowerCase() === "persona_shared" &&
              n.additional_data?.persona_id !== undefined
          )
          .map((n) => n.additional_data!.persona_id!);

        if (personaIds.length > 0) {
          const queryParams = personaIds
            .map((id) => `persona_ids=${id}`)
            .join("&");
          try {
            const response = await fetch(`/api/persona?${queryParams}`);

            if (!response.ok) {
              throw new Error(
                `Error fetching personas: ${response.statusText}`
              );
            }
            const personasData: Persona[] = await response.json();
            setPersonas(
              personasData.reduce(
                (acc, persona) => {
                  acc[persona.id] = persona;
                  return acc;
                },
                {} as Record<number, Persona>
              )
            );
          } catch (err) {
            console.error("Failed to fetch personas:", err);
          }
        }
      }
    };

    fetchPersonas();
  }, [notifications]);

  const dismissNotification = async (notificationId: number) => {
    try {
      await fetch(`/api/notifications/${notificationId}/dismiss`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      refreshNotifications();
    } catch (error) {
      console.error("Error dismissing notification:", error);
    }
  };

  const handleAssistantShareAcceptance = async (
    notification: Notification,
    persona: Persona
  ) => {
    addAssistantToList(persona.id);
    await dismissNotification(notification.id);
    await refreshUser();
    await refreshAssistants();
  };

  const sortedNotifications = notifications
    ? notifications
        .filter((notification) => {
          const personaId = notification.additional_data?.persona_id;
          return personaId !== undefined && personas[personaId] !== undefined;
        })
        .sort(
          (a, b) =>
            new Date(b.time_created).getTime() -
            new Date(a.time_created).getTime()
        )
    : [];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showDropdown &&
        !(event.target as Element).closest(".notification-dropdown")
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

  return (
    <div className="relative">
      <div
        onClick={() => setShowDropdown(!showDropdown)}
        className="cursor-pointer relative notification-dropdown"
      >
        <svg
          className="w-6 h-6 text-text-600 hover:text-text-800"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z" />
        </svg>
        {sortedNotifications.length > 0 && (
          <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
        )}
      </div>
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl z-20 max-h-[80vh] overflow-y-auto notification-dropdown">
          {sortedNotifications.length > 0 ? (
            sortedNotifications
              .filter(
                (notification) =>
                  notification.notif_type === NotificationType.PERSONA_SHARED
              )
              .map((notification) => {
                const persona = notification.additional_data?.persona_id
                  ? personas[notification.additional_data.persona_id]
                  : null;

                return (
                  <div
                    key={notification.id}
                    className="px-4 py-3 border-b last:border-b-0 hover:bg-gray-50 transition duration-150 ease-in-out"
                  >
                    <div className="flex items-start">
                      {persona && (
                        <div className="mt-2 flex-shrink-0 mr-3">
                          <AssistantIcon assistant={persona} size="small" />
                        </div>
                      )}
                      <div className="flex-grow">
                        <p className="font-semibold text-sm text-gray-800">
                          New Assistant Shared With You
                        </p>

                        <p className="text-sm text-gray-600 mt-1">
                          Do you want to accept this assistant?
                        </p>
                        {persona && (
                          <p className="text-xs text-gray-500 mt-1">
                            Assistant: {persona.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-end mt-2 space-x-2">
                      <button
                        onClick={() =>
                          handleAssistantShareAcceptance(notification, persona!)
                        }
                        className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-800 transition duration-150 ease-in-out"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => dismissNotification(notification.id)}
                        className="px-3 py-1 text-sm font-medium text-gray-600 hover:text-gray-800 transition duration-150 ease-in-out"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                );
              })
          ) : (
            <div className="px-4 py-3 text-center text-gray-600">
              No new notifications
            </div>
          )}
        </div>
      )}
    </div>
  );
};
