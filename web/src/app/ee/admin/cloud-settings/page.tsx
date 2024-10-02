"use client";

import { AdminPageTitle } from "@/components/admin/Title";
import {
  Cloud,
  Users,
  Calendar,
  CreditCard,
  ArrowUp,
  Headset,
} from "@phosphor-icons/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

export default function Page() {
  const [seats, setSeats] = useState(1);
  const router = useRouter();

  const handleUpgrade = async () => {
    try {
      const stripe = await stripePromise;
      if (!stripe) throw new Error("Stripe failed to load");

      const response = await fetch("/api/tenants/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ quantity: seats }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Failed to create checkout session: ${errorData.message || response.statusText}`
        );
      }

      const { id: sessionId } = await response.json();

      if (!sessionId) {
        throw new Error("No session ID returned from the server");
      }

      const result = await stripe.redirectToCheckout({ sessionId });

      if (result.error) {
        throw new Error(result.error.message);
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
      // Handle error (e.g., show error message to user)
    }
  };

  return (
    <div className="container max-w-4xl">
      <AdminPageTitle
        title="Cloud Settings"
        icon={<Cloud size={32} className="my-auto text-blue-500" />}
      />

      <div className="space-y-8">
        <div className="bg-white shadow-md rounded-lg p-8 border border-gray-200">
          <h2 className="text-2xl font-semibold mb-6 text-gray-800 flex items-center">
            <CreditCard className="mr-2 text-blue-500" size={24} />
            Account Overview
          </h2>
          <div className="grid grid-cols-2 gap-6">
            {[
              { label: "Number of Users", value: "25", icon: <Users /> },
              { label: "Billing Period", value: "Monthly", icon: <Calendar /> },
              {
                label: "Current Plan",
                value: "Business",
                icon: <CreditCard />,
              },
              {
                label: "Next Billing Date",
                value: "May 1, 2024",
                icon: <Calendar />,
              },
            ].map((item, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="text-blue-500">{item.icon}</div>
                <div>
                  <p className="text-sm text-gray-600">{item.label}</p>
                  <p className="text-lg font-medium text-gray-800">
                    {item.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white shadow-md rounded-lg p-8 border border-gray-200">
          <h2 className="text-2xl font-semibold mb-6 text-gray-800 flex items-center">
            <ArrowUp className="mr-2 text-blue-500" size={24} />
            Upgrade Seats
          </h2>
          <div className="flex items-center space-x-4">
            <input
              type="number"
              min="1"
              value={seats}
              onChange={(e) => setSeats(Number(e.target.value))}
              className="border rounded-md px-3 py-2 w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Seats"
            />
            <button
              onClick={handleUpgrade}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            >
              Upgrade
            </button>
          </div>
        </div>

        <div className="bg-white shadow-md rounded-lg p-8 border border-gray-200">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800 flex items-center">
            <Headset className="mr-2 text-blue-500" size={24} />
            Need Help?
          </h2>
          <p className="mb-6 text-gray-600">
            Our team is here to assist you with any questions or concerns you
            may have about your cloud settings or account.
          </p>
          <button className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50">
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
}
