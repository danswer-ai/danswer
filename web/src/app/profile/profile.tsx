import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User as UserTypes } from "@/lib/types";
import { User } from "lucide-react";
import Logo from "../../../public/logo.png";
import Image from "next/image";
import { CustomModal } from "@/components/CustomModal";

export default function Profile({ user }: { user: UserTypes | null }) {
  return (
    <div className="h-full overflow-x-hidden">
      <h1 className="text-black text-3xl font-semibold">User Settings</h1>

      <div className="pt-10">
        <div className="flex py-8 border-b">
          <div className="w-[500px] text-sm">
            <span className="font-semibold text-black">Your Photo</span>
            <p className="pt-1">This will be displayed on your profile.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center bg-white rounded-full min-h-[65px] min-w-[65px] max-h-[65px] max-w-[65px] aspect-square text-2xl font-normal border-2 border-gray-900 text-default py-2">
              {user && user.email ? (
                user.email[0].toUpperCase()
              ) : (
                <User size={25} className="mx-auto" />
              )}
            </div>
            <Button variant="link" className="text-error px-2">
              Delete
            </Button>
            <Button variant="link" className="px-2">
              Update
            </Button>
          </div>
        </div>

        <div className="py-8 border-b flex flex-col gap-5">
          <div className="flex items-center">
            <div className="w-[500px] text-sm">
              <span className="font-semibold text-black">Name</span>
            </div>
            <div className="w-[500px] h-10 flex items-center justify-between">
              <span className="font-semibold text-black">John Luis Jokic</span>{" "}
              <Button variant="outline">Edit</Button>
            </div>
          </div>
          <div className="flex items-center">
            <div className="w-[500px] text-sm">
              <span className="font-semibold text-black">Email</span>
            </div>
            <div className="w-[500px] h-10 flex items-center justify-between">
              <span className="font-semibold text-black">John Luis Jokic</span>{" "}
              <Button variant="outline">Edit</Button>
            </div>
          </div>
          <div className="flex items-center">
            <div className="w-[500px] text-sm">
              <span className="font-semibold text-black">Phone</span>
            </div>
            <div className="w-[500px] h-10 flex items-center justify-between">
              <span className="font-semibold text-black">John Luis Jokic</span>
              <Button variant="outline">Edit</Button>
            </div>
          </div>
        </div>

        <div className="flex py-8 border-b">
          <div className="w-[500px] text-sm">
            <span className="font-semibold text-black">
              Linked team account
            </span>
            <p className="w-3/4 pt-1">
              Easily switch between them and access both accounts from any
              device.
            </p>
          </div>
          <div className="flex flex-col gap-3 w-[500px]">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <Image src={Logo} alt="Logo" width={65} height={65} />
                <span className="font-semibold text-black">enMedD</span>
              </div>

              <Button variant="outline">Manage Team</Button>
            </div>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <Image src={Logo} alt="Logo" width={65} height={65} />
                <span className="font-semibold text-black">enMedD</span>
              </div>

              <Button variant="outline">Manage Team</Button>
            </div>
          </div>
        </div>

        <div className="flex py-8 justify-end">
          <div className="flex gap-3">
            <Button variant="destructive">Cancel</Button>
            <Button>Save Changes</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
