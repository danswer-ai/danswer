"use client";

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { buildClientUrl } from "@/lib/utilsSS";
import { BillingPlanType } from "@/app/admin/settings/interfaces";
// import { buildUrl } from '@/lib/utilsSS';

export function StripeCheckoutButton({
  newQuantity,
  newPlan,
  currentQuantity,
  currentPlan,
}: {
  newQuantity: number;
  newPlan: BillingPlanType;
  currentQuantity: number;
  currentPlan: BillingPlanType;
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    console.log(newQuantity);
    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ quantity: newQuantity, plan: newPlan }),
      });

      if (!response.ok) {
        throw new Error("Failed to create checkout session");
      }

      const { sessionId } = await response.json();
      const stripe = await loadStripe(
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
      );
      if (stripe) {
        await stripe.redirectToCheckout({ sessionId });
      } else {
        throw new Error("Stripe failed to load");
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`py-2 px-4 text-white rounded ${
        currentPlan === newPlan && currentQuantity === newQuantity
          ? "bg-gray-400 cursor-not-allowed"
          : "bg-blue-500 hover:bg-blue-600"
      } disabled:bg-blue-300`}
      disabled={
        (currentPlan === newPlan && currentQuantity === newQuantity) ||
        isLoading
      }
    >
      {isLoading
        ? "Loading..."
        : currentPlan === newPlan && currentQuantity === newQuantity
          ? "No Changes"
          : newPlan > currentPlan ||
              (newPlan === currentPlan && newQuantity > currentQuantity)
            ? "Upgrade Plan"
            : newPlan == BillingPlanType.ENTERPRISE
              ? "Talk to us"
              : // : newPlan < currentPlan ||
                newPlan === currentPlan && newQuantity < currentQuantity
                ? "Upgrade Plan"
                : "Change Plan"}
    </button>
  );
}
