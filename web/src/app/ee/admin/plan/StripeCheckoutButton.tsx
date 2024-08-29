"use client";

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { buildClientUrl } from "@/lib/utilsSS";
import { BillingPlanType } from "@/app/admin/settings/interfaces";
// import { buildUrl } from '@/lib/utilsSS';

export function StripeCheckoutButton({
  quantity,
  plan,
}: {
  quantity: number;
  plan: BillingPlanType;
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    console.log(quantity);
    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ quantity, plan }),
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
      disabled={isLoading}
      className="py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
    >
      {isLoading ? "Loading..." : "Proceed to Checkout"}
    </button>
  );
}
