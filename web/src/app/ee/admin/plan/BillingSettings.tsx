"use client";

import { BillingPlanType } from "@/app/admin/settings/interfaces";
import { useContext, useEffect, useState } from "react";
import { SettingsContext } from "@/components/settings/SettingsProvider";
import { Button, Divider, Card } from "@tremor/react";
import { StripeCheckoutButton } from "./StripeCheckoutButton";
import {
  CheckmarkIcon,
  CheckmarkCircleIcon,
  LightningIcon,
  PeopleIcon,
  XIcon,
  ChevronDownIcon,
} from "@/components/icons/icons";
import { FiAward, FiDollarSign, FiStar } from "react-icons/fi";
import Cookies from "js-cookie";
import { Modal } from "@/components/Modal";
import { Logo } from "@/components/Logo";
import { useSearchParams } from "next/navigation";
import { usePopup } from "@/components/admin/connectors/Popup";

export function BillingSettings({ newUser }: { newUser: boolean }) {
  const settings = useContext(SettingsContext);
  const cloudSettings = settings?.cloudSettings;

  const searchParams = useSearchParams();

  const [isOpen, setIsOpen] = useState(false);
  const [isNewUserOpen, setIsNewUserOpen] = useState(true)

  const [newSeats, setNewSeats] = useState<null | number>(null);
  const [newPlan, setNewPlan] = useState<null | BillingPlanType>(null);


  const { popup, setPopup } = usePopup();


  useEffect(() => {
    const success = searchParams.get("success");
    if (success === "true") {
      setPopup({
        message: "Your plan has been successfully updated!",
        type: "success",
      });
    } else if (success === "false") {
      setPopup({
        message: "There was an error updating your plan",
        type: "error",
      });
    }

    // Clear the 'success' parameter from the URL
    if (success) {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("success");
      window.history.replaceState({}, "", newUrl);
    }
  }, []);

  // Use actual data from cloudSettings
  const currentPlan = cloudSettings?.planType;
  const seats = cloudSettings?.numberOfSeats!;

  useEffect(() => {
    if (cloudSettings) {
      setNewSeats(cloudSettings.numberOfSeats);
      setNewPlan(cloudSettings.planType);
    }
  }, [cloudSettings]);
  

  if (!cloudSettings) {
    return null;
  }


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

  function getBillingPlanIcon(planType: BillingPlanType) {
    switch (planType) {
      case BillingPlanType.FREE:
        return <FiStar />;
      case BillingPlanType.PREMIUM:
        return <FiDollarSign />;
      case BillingPlanType.ENTERPRISE:
        return <FiAward />;
      default:
        return <FiStar />;
    }
  }

  const handleCloseModal = () => {
    setIsNewUserOpen(false);
    Cookies.set("new_auth_user", "false");
  };


  if (newSeats === null || currentPlan === undefined) {
    return null;
  }
  
  return (
    <div className="max-w-4xl mr-auto space-y-8 p-6">
      {newUser && isNewUserOpen && (
        <Modal
          onOutsideClick={handleCloseModal}
          className="max-w-lg w-full p-8  bg-background-150 rounded-lg shadow-xl"
        >
          <>
            <h2 className="text-3xl font-semibold text-text-900 mb-6 text-center">
              Welcome to Danswer!
            </h2>
            <div className="text-center mb-8">
              <Logo className="mx-auto mb-4" height={150} width={150} />
              <p className="text-lg text-text-700 leading-relaxed">
                We&apos;re thrilled to have you on board! Here, you can manage your
                billing settings and explore your plan details.
              </p>
            </div>
            <div className="flex justify-center">
              <Button
                onClick={handleCloseModal}
                className="px-8 py-3 bg-blue-600 text-white text-lg font-semibold rounded-full hover:bg-blue-700 transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
              >
                Let&apos;s Get Started
              </Button>
              <Button
                onClick={() => window.open("mailto:support@danswer.ai")}
                className="border-0 hover:underline ml-4 px-4 py-2 bg-gray-200 w-fit text-text-700 text-sm font-medium rounded-full hover:bg-gray-300 transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50 flex items-center"
              >
                Questions?
              </Button>
            </div>
          </>
        </Modal>
      )}
      <Card className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="px-8 py-6">
          <h2 className="text-3xl gap-x-2 font-bold text-text-800 mb-6 flex items-center">
            Your Plan
            <CheckmarkCircleIcon size={24} className="text-blue-500" />
          </h2>
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <p className="text-lg text-text-600 flex gap-x-2 items-center">
                <LightningIcon size={20} />
                Tier:
              </p>
              <span className="text-xl font-semibold text-blue-600 capitalize">
                {currentPlan}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-lg text-text-600  gap-x-2 flex items-center">
                <PeopleIcon size={20} />
                Current Seats:
              </p>
              <span className="text-xl font-semibold text-blue-600">
                {seats}
              </span>
            </div>

            <Divider />

            <div className="mt-6 relative">
              <label className="block text-lg font-medium text-text-700 mb-2 flex items-center">
                New Tier:
              </label>
              <div
                className="w-full px-4 py-2 text-lg border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-150 ease-in-out flex items-center justify-between cursor-pointer"
                onClick={() => setIsOpen(!isOpen)}
              >
                <span className="flex items-center">
                  {getBillingPlanIcon(newPlan!)}
                  <span className="ml-2 capitalize">{newPlan}</span>
                </span>
                <ChevronDownIcon size={12} />
              </div>
              {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                  {Object.values(BillingPlanType).map((plan) => (
                    <div
                      key={plan}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center"
                      onClick={() => {
                        setNewPlan(plan);
                        setIsOpen(false);
                        if (plan === BillingPlanType.FREE) {
                          setNewSeats(1);
                        }
                      }}
                    >
                      {getBillingPlanIcon(plan)}
                      <span className="ml-2 capitalize">{plan}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-6">
              <label className="block text-lg font-medium text-text-700 mb-2 flex items-center">
                New Number of Seats:
              </label>
              {newPlan === BillingPlanType.FREE ? (
                <input
                  type="number"
                  value={1}
                  disabled
                  className="w-full px-4 py-2 text-lg border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                />
              ) : (
                <input
                  type="number"
                  value={newSeats}
                  onChange={(e) => setNewSeats(Number(e.target.value))}
                  min="1"
                  className="w-full px-4 py-2 text-lg border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-150 ease-in-out"
                />
              )}
            </div>
            <div className="mt-8 flex justify-center">
              <StripeCheckoutButton
                currentPlan={currentPlan}
                currentQuantity={cloudSettings.numberOfSeats}
                newQuantity={newSeats}
                newPlan={newPlan!}
              />
            </div>
          </div>
        </div>
      </Card>

      <Card className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="px-6 py-4">
          <h2 className="text-3xl font-bold text-text-800 mb-4">Features</h2>
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
                    feature.included ? "text-text-800" : "text-text-500"
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
            <h2 className="text-3xl font-bold text-text-800 mb-4">
              Tenant Deletion
            </h2>
            <p className="text-text-600 mb-6">
              Permanently delete your tenant and all associated data.
            </p>
            <div
              className="bg-red-100 border-l-4 border-red-500 text-error p-4 mb-6"
              role="alert"
            >
              <p className="font-bold">Warning:</p>
              <p>Deleting your tenant will result in the following:</p>
              <ul className="list-disc list-inside mt-2">
                <li>
                  All data associated with this tenant will be permanently
                  deleted
                </li>
                <li>This action cannot be undone</li>
              </ul>
            </div>
            <Button
              onClick={() => {
                alert("not implemented");
              }}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg transition duration-300 shadow-md hover:shadow-lg"
            >
              Delete Tenant
            </Button>
          </div>
        </Card>
      )}
      {popup}
    </div>
  );
}
