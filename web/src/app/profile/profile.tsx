import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { User as UserTypes } from "@/lib/types";
import Image from "next/image";
import Logo from "../../../public/logo.png";
import { User } from "lucide-react";

export default function Profile({ user }: { user: UserTypes | null }) {
  return (
    <div className="h-full overflow-x-hidden">
      <div className="flex items-center gap-3 pb-4">
        <div className="flex items-center justify-center bg-white rounded-full min-h-16 min-w-16 max-h-16 max-w-16 aspect-square text-2xl border-2 border-gray-900 text-default py-2">
          {user && user.email ? (
            user.email[0].toUpperCase()
          ) : (
            <User size={25} className="mx-auto" />
          )}
        </div>
        <span className="text-xl text-black font-semibold">Johnny Luis</span>
      </div>

      <p className="pb-4">Manage your details and personal preferences here.</p>

      <span className="py-2 block">Basics</span>
      <Separator />
      <div className="py-4 flex">
        <span className="w-[500px]">Photo</span>
        <div className="flex-1">
          <div className="flex items-center justify-center bg-white rounded-full min-h-10 min-w-10 max-h-10 max-w-10 aspect-square border-2 border-gray-900 text-default py-2">
            {user && user.email ? (
              user.email[0].toUpperCase()
            ) : (
              <User size={25} className="mx-auto" />
            )}
          </div>
        </div>
        <Button variant="outline">Edit</Button>
      </div>
      <Separator />
      <div className="py-4 flex">
        <span className="w-[500px]">Name</span>
        <p className="flex-1">Johnny Luis</p>
        <Button variant="outline">Edit</Button>
      </div>
      <Separator />
      <div className="py-4 flex">
        <span className="w-[500px]">Email</span>
        <p className="flex-1">{user?.email}</p>
        <Button variant="outline">Edit</Button>
      </div>
      <Separator />
      <div className="py-4 flex">
        <span className="w-[500px]">Workspace</span>
        <div className="flex items-center gap-3 flex-1">
          <Image src={Logo} alt="Logo" width={48} height={48} />
          <p>Legendary Workspace</p>
        </div>
        <Button variant="outline">Manage Workspace</Button>
      </div>
    </div>
  );
}
