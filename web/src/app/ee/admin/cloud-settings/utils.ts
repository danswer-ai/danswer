import { Stripe } from "@stripe/stripe-js";

export const fetchCheckoutSession = async (stripe: Stripe, seats: number) => {
  return await fetch("/api/tenants/create-checkout-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ quantity: seats }),
  });
};

export const fetchCustomerPortal = async () => {
  return await fetch("/api/tenants/create-customer-portal-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });
};

export const statusToDisplay = (status: string) => {
  switch (status) {
    case "trialing":
      return "Trialing";
    case "active":
      return "Active";
    case "canceled":
      return "Canceled";
    case "incomplete":
      return "Incomplete";
  }
};
