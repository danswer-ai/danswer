import { Button } from "@/components/ui/button";
import { User as UserTypes } from "@/lib/types";
import Image from "next/image";
import { User } from "lucide-react";
import Logo from "../../../../public/logo.png";

export default function SecurityTab({ user }: { user: UserTypes | null }) {
  return (
    <>
      <div className="flex py-8 border-b">
        <div className="w-[500px] text-sm">
          <span className="font-semibold text-inverted-inverted">Password</span>
          <p className="pt-1">
            Please enter your current password to change your password
          </p>
        </div>
      </div>

      <div className="py-8 border-b flex flex-col gap-5">
        <div className="flex items-center">
          <div className="w-[500px] text-sm">
            <span className="font-semibold text-inverted-inverted">
              Current Password
            </span>
          </div>
          <div className="w-[500px] h-10 flex items-center justify-between">
            <span className="font-semibold text-inverted-inverted">
              &#9679;&#9679;&#9679;&#9679;&#9679;&#9679;&#9679;&#9679;
            </span>
            <Button variant="outline">Edit</Button>
          </div>
        </div>
      </div>
      <div className="py-8 border-b flex flex-col gap-5">
        <div className="flex items-center">
          <div className="w-[500px] text-sm">
            <span className="font-semibold text-inverted-inverted">
              New Password
            </span>
          </div>
          <div className="w-[500px] h-10 flex items-center justify-between">
            <div>
              <span className="font-semibold text-inverted-inverted">
                &#9679;&#9679;&#9679;&#9679;&#9679;&#9679;&#9679;&#9679;
              </span>
              <p className="font-medium text-xs">
                Your new password must be more that 8 characters
              </p>
            </div>
            <Button variant="outline">Edit</Button>
          </div>
        </div>
      </div>
      <div className="py-8 border-b flex flex-col gap-5">
        <div className="flex items-center">
          <div className="w-[500px] text-sm">
            <span className="font-semibold text-inverted-inverted">
              Confirm Password
            </span>
          </div>
          <div className="w-[500px] h-10 flex items-center justify-between">
            <span className="font-semibold text-inverted-inverted">
              &#9679;&#9679;&#9679;&#9679;&#9679;&#9679;&#9679;&#9679;
            </span>
            <Button variant="outline">Edit</Button>
          </div>
        </div>
      </div>

      <div className="flex py-8 justify-end">
        <div className="flex gap-3">
          <Button>Save Changes</Button>
        </div>
      </div>
    </>
  );
}
