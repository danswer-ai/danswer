import { LogOut, MessageCircleMore, User, Wrench } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserProfile } from "./UserProfile";
import { useContext, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "./user/UserProvider";
import { SettingsContext } from "./settings/SettingsProvider";
import { checkUserIsNoAuthUser, logout } from "@/lib/user";
import Link from "next/link";
import { LOGOUT_DISABLED } from "@/lib/constants";

export function UserSettingsButton({ defaultPage }: { defaultPage?: string }) {
  const [userInfoVisible, setUserInfoVisible] = useState(false);
  const { toast } = useToast();
  const userInfoRef = useRef<HTMLDivElement>(null);
  const settings = useContext(SettingsContext);
  const router = useRouter();
  const { teamspaceId } = useParams();
  const { user, isAdmin, isLoadingUser, isTeamspaceAdmin } = useUser();

  const handleLogout = () => {
    logout().then((isSuccess) => {
      if (!isSuccess) {
        toast({
          title: "Logout Failed",
          description: "There was an issue logging out. Please try again.",
          variant: "destructive",
        });
      }
      router.push("/auth/login");
    });
  };

  const showLogout =
    user && !checkUserIsNoAuthUser(user.id) && !LOGOUT_DISABLED;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="focus:outline-none">
        <UserProfile
          user={user}
          onClick={() => setUserInfoVisible(!userInfoVisible)}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="end">
        <DropdownMenuLabel>
          <div className="flex rounded-regular items-center gap-3 group">
            <UserProfile user={user} />
            <div className="flex flex-col w-[160px]">
              <span className="truncate">
                {user?.full_name || "Unknown User"}
              </span>
              <span className="text-dark-500 truncate font-normal">
                {user?.email || "anonymous@gmail.com"}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {settings?.featureFlags.profile_page && (
            <DropdownMenuItem asChild>
              <Link href="/profile" className="flex gap-2 items-center">
                <User size={16} strokeWidth={1.5} />
                <span>Profile Settings</span>
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link
              // redirect to default page
              href={
                teamspaceId
                  ? `/t/${teamspaceId}/${defaultPage}`
                  : `/${defaultPage}`
              }
              className="flex gap-2 items-center"
            >
              <MessageCircleMore size={16} strokeWidth={1.5} />
              <span>Chat & Search</span>
            </Link>
          </DropdownMenuItem>
          {isTeamspaceAdmin && (
            <DropdownMenuItem asChild>
              <Link
                href={`/t/${teamspaceId}/admin/indexing/status`}
                className="flex gap-2 items-center"
              >
                <Wrench size={16} strokeWidth={1.5} />
                <span>Teamspace Admin Panel</span>
              </Link>
            </DropdownMenuItem>
          )}
          {isAdmin && (
            <DropdownMenuItem asChild>
              <Link
                href="/admin/indexing/status"
                className="flex gap-2 items-center"
              >
                <Wrench size={16} strokeWidth={1.5} />
                <span>Workspace Admin Panel</span>
              </Link>
            </DropdownMenuItem>
          )}
          {showLogout && (
            <DropdownMenuItem asChild onClick={handleLogout}>
              <div className="flex gap-2 items-center">
                <LogOut size={16} strokeWidth={1.5} />
                <span>Log out</span>
              </div>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
