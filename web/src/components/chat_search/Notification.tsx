import React, { useState } from "react";

import { Notification } from "../../app/chat/interfaces";

export const NotificationCard = ({
  notifications,
  refreshNotifications,
}: {
  notifications?: Notification[];
  refreshNotifications: () => void;
}) => {
  const [showDropdown, setShowDropdown] = useState(false);

  const dismissNotification = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}/dismiss`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("Error dismissing notification:", error);
    }
  };

  const handleDismiss = async (notificationId: string) => {
    try {
      await dismissNotification(notificationId);
      refreshNotifications();
    } catch (error) {
      console.error("Error dismissing notification:", error);
    }
  };

  const handleAccept = async (notification: Notification) => {
    // Handle accept logic based on notification.additional_data
    // For example, accept a shared persona
    // await acceptSharedPersona(notification.additional_data.persona_id);
    // Then dismiss the notification
    await handleDismiss(notification.id);
  };
  if (!notifications) {
    return null;
  }

  return (
    <div className="relative">
      <div
        onClick={() => setShowDropdown(!showDropdown)}
        className="cursor-pointer"
      >
        <svg className="w-6 h-6">
          {/* Bell icon SVG */}
          <path d="..." />
        </svg>
        {notifications.length > 0 && (
          <span className="absolute top-0 right-0 h-2 w-2 bg-orange-500 rounded-full"></span>
        )}
      </div>
      {showDropdown && (
        <div className="absolute right-0 mt-2 py-2 w-80 bg-white rounded-md shadow-xl z-20">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <div key={notification.id} className="px-4 py-2 border-b">
                <p className="font-semibold">{notification.title}</p>
                <p className="text-sm text-gray-600">{notification.message}</p>
                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => handleAccept(notification)}
                    className="text-sm text-blue-500 mr-4"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleDismiss(notification.id)}
                    className="text-sm text-red-500"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="px-4 py-2 text-center text-gray-600">
              No new notifications
            </div>
          )}
        </div>
      )}
    </div>
  );
};
