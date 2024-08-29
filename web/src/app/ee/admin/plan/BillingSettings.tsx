"use client";

import { useRouter } from "next/navigation";
import {
  BillingPlanType,
  EnterpriseSettings,
} from "@/app/admin/settings/interfaces";
import { useContext, useState } from "react";
import { SettingsContext } from "@/components/settings/SettingsProvider";
import { Form, Formik } from "formik";
import * as Yup from "yup";
import {
  Label,
  SubLabel,
  TextFormField,
} from "@/components/admin/connectors/Field";
import { Button, Divider, Text, Card } from "@tremor/react";
import Link from "next/link";
import { StripeCheckoutButton } from "./StripeCheckoutButton";
import { CheckmarkIcon, XIcon } from "@/components/icons/icons";
// import { StripeCheckoutButton } from "@/components/StripeButton";

export function BillingSettings() {
  const router = useRouter();
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const settings = useContext(SettingsContext);
  if (!settings) {
    return null;
  }
  const cloudSettings = settings.cloudSettings;

  // Use actual data from cloudSettings
  const currentPlan = cloudSettings?.planType;
  const seats = cloudSettings?.numberOfSeats!;
  const features = [
    { name: "All Connector Access", included: true },
    { name: "Basic Support", included: true },
    { name: "Custom Branding", included: currentPlan !== BillingPlanType.FREE },
    {
      name: "Analytics Dashboard",
      included: currentPlan !== BillingPlanType.FREE,
    },
    { name: "Query History", included: currentPlan !== BillingPlanType.FREE },
    {
      name: "Priority Support",
      included: currentPlan !== BillingPlanType.FREE,
    },
    {
      name: "Service Level Agreements (SLAs)",
      included: currentPlan === BillingPlanType.ENTERPRISE,
    },
    {
      name: "Advanced Support",
      included: currentPlan === BillingPlanType.ENTERPRISE,
    },
    {
      name: "Custom Integrations",
      included: currentPlan === BillingPlanType.ENTERPRISE,
    },
    {
      name: "Dedicated Account Manager",
      included: currentPlan === BillingPlanType.ENTERPRISE,
    },
  ];

  const [newSeats, setNewSeats] = useState(seats);
  const [newPlan, setNewPlan] = useState(currentPlan);

  return (
    <div className="max-w-4xl mr-auto space-y-8 p-6">
      <Card className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="px-8 py-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">
            Current Plan
          </h2>
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <p className="text-lg text-gray-600">Current Plan:</p>
              <span className="text-xl font-semibold text-blue-600 capitalize">
                {currentPlan}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-lg text-gray-600">Current Seats:</p>
              <span className="text-xl font-semibold text-blue-600">
                {seats}
              </span>
            </div>
            <Divider />
            <div className="mt-6">
              <label className="block text-lg font-medium text-gray-700 mb-2">
                New Plan:
              </label>
              <select
                value={newPlan}
                onChange={(e) => setNewPlan(e.target.value as BillingPlanType)}
                className="w-full px-4 py-2 text-lg border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-150 ease-in-out"
              >
                {Object.values(BillingPlanType).map((plan) => (
                  <option key={plan} value={plan} className="capitalize">
                    {plan}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-6">
              <label className="block text-lg font-medium text-gray-700 mb-2">
                New Number of Seats:
              </label>
              <input
                type="number"
                value={newSeats}
                onChange={(e) => setNewSeats(Number(e.target.value))}
                min="1"
                className="w-full px-4 py-2 text-lg border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-150 ease-in-out"
              />
            </div>
            <div className="mt-8 flex justify-center">
              <StripeCheckoutButton quantity={newSeats} plan={newPlan} />
            </div>
          </div>
        </div>
      </Card>

      <Card className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="px-6 py-4">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Features</h2>
          <ul className="space-y-3">
            {features.map((feature, index) => (
              <li key={index} className="flex items-center text-lg">
                <span className="mr-3">
                  {feature.included ? (
                    <CheckmarkIcon className="text-success" />
                  ) : (
                    <XIcon className="text-error" />
                  )}
                </span>
                <span
                  className={
                    feature.included ? "text-gray-800" : "text-gray-500"
                  }
                >
                  {feature.name}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Card>
      {currentPlan !== BillingPlanType.FREE && (
        <Card className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="px-8 py-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              Tenant Merging
            </h2>
            <p className="text-gray-600 mb-6">
              Merge your tenant with another to consolidate resources and users.
            </p>
            <div
              className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6"
              role="alert"
            >
              <p className="font-bold">Warning:</p>
              <p>Merging tenants will result in the following:</p>
              <ul className="list-disc list-inside mt-2">
                <li>Data from the other tenant will be abandoned</li>
                <li>
                  Billing for the merged tenant will transfer to this account
                </li>
              </ul>
            </div>
            <Button
              onClick={() => {
                alert("not implemented");
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition duration-300 shadow-md hover:shadow-lg"
            >
              Start Tenant Merge Process
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
