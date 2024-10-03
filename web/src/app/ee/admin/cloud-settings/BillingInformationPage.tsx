"use client";

import { CreditCard, ArrowUp } from "@phosphor-icons/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { usePopup } from "@/components/admin/connectors/Popup";
import { FaExternalLinkAlt } from "react-icons/fa";
import { BillingInformation } from "./page";
import { SettingsIcon } from "@/components/icons/icons";
import {
  fetchCheckoutSession,
  fetchCustomerPortal,
  statusToDisplay,
} from "./utils";

export default function BillingInformationPage({
  billingInformation,
}: {
  billingInformation: BillingInformation;
}) {
  const [seats, setSeats] = useState(1);
  const router = useRouter();
  const { popup, setPopup } = usePopup();
  const stripePromise = loadStripe(
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
  );

  const handleUpgrade = async () => {
    try {
      const stripe = await stripePromise;

      if (!stripe) throw new Error("Stripe failed to load");
      const response = await fetchCheckoutSession(stripe, seats);

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
      setPopup({
        message: "Error creating checkout session",
        type: "error",
      });
    }
  };

  const handleManageSubscription = async () => {
    try {
      const response = await fetchCustomerPortal();

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Failed to create customer portal session: ${errorData.message || response.statusText}`
        );
      }

      const { url } = await response.json();

      if (!url) {
        throw new Error("No portal URL returned from the server");
      }

      // Redirect to the Stripe Customer Portal
      router.push(url);
    } catch (error) {
      console.error("Error creating customer portal session:", error);
      setPopup({
        message: "Error creating customer portal session",
        type: "error",
      });
    }
  };

  return (
    <div className="space-y-8">
      {popup}
      <div className="bg-background-100 rounded-lg p-6 border border-border-200">
        <h2 className="text-2xl font-bold mb-4 text-text-900 flex items-center">
          <CreditCard className="mr-3 text-blue-600" size={24} />
          Billing Information
        </h2>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-background-50 p-3 rounded-md">
            <p className="text-sm font-medium text-text-600">Seats</p>
            <p className="text-lg font-semibold text-text-900 bg-transparent border-none">
              {billingInformation.seats}
            </p>
          </div>
          <div className="bg-background-50 p-3 rounded-md">
            <p className="text-sm font-medium text-text-600">
              Subscription Status
            </p>
            <p className="text-lg font-semibold text-text-900 bg-transparent border-none">
              {statusToDisplay(billingInformation.subscriptionStatus)}
            </p>
          </div>
          <div className="bg-background-50 p-3 rounded-md">
            <p className="text-sm font-medium text-text-600">Billing Start</p>
            <p className="text-lg font-semibold text-text-900 bg-transparent border-none">
              {new Date(billingInformation.billingStart).toLocaleDateString()}
            </p>
          </div>
          <div className="bg-background-50 p-3 rounded-md">
            <p className="text-sm font-medium text-text-600">Billing End</p>
            <p className="text-lg font-semibold text-text-900 bg-transparent border-none">
              {new Date(billingInformation.billingEnd).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <input
            type="number"
            min="1"
            value={seats}
            onChange={(e) => setSeats(Number(e.target.value))}
            className="border border-border-200 rounded-md px-3 py-2 w-24 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background-50 text-text-800"
            placeholder="Seats"
          />
          <button
            onClick={handleUpgrade}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 font-medium"
          >
            Upgrade Seats
          </button>
        </div>
      </div>

      <div className="bg-background-100 rounded-lg p-6 border border-border-200">
        <h2 className="text-2xl font-bold mb-4 text-text-900 flex items-center">
          <SettingsIcon className="mr-3 text-blue-600" size={24} />
          Manage Subscription
        </h2>
        <p className="text-text-700 mb-6">
          View your current plan, update payment methods, or change your
          subscription.
        </p>
        <button
          onClick={handleManageSubscription}
          className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 flex items-center justify-center font-medium w-full sm:w-auto"
          disabled={!billingInformation.paymentMethodEnabled}
        >
          <FaExternalLinkAlt className="mr-2" size={16} />
          Manage Subscription
        </button>
        {!billingInformation.paymentMethodEnabled && (
          <p className="text-sm text-red-500 mt-2 font-medium">
            Payment method not enabled
          </p>
        )}
      </div>
    </div>
  );
}
