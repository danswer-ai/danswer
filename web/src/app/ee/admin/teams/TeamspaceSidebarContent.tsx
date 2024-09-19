import { CustomModal } from "@/components/CustomModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Teamspace } from "@/lib/types";
import { Bookmark, Copy, Plus } from "lucide-react";

interface TeamspaceSidebarContentProps {
  teamspace: Teamspace & { gradient: string };
}

export const TeamspaceSidebarContent = ({
  teamspace,
}: TeamspaceSidebarContentProps) => {
  return (
    <>
      <div style={{ background: teamspace.gradient }} className="h-40 relative">
        <div className="absolute top-full -translate-y-1/2 left-1/2 -translate-x-1/2">
          <span
            style={{ background: teamspace.gradient }}
            className="text-3xl uppercase font-bold min-w-16 min-h-16 flex items-center justify-center rounded-xl text-inverted border-[5px] border-inverted"
          >
            {teamspace.name.charAt(0)}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center px-6 py-14 w-full">
        <div className="flex flex-col items-center">
          <h1 className="text-center font-bold text-xl md:text-[28px]">
            {teamspace.name}
          </h1>
          <span className="text-center text-primary pt-3 font-medium">
            @MR.AI
          </span>
          <p className="text-center text-subtle pt-4 text-sm">
            Lorem ipsum dolor, sit amet consectetur adipisicing elit.
            Perferendis omnis nesciunt est saepe sequi nam cum ratione
            aspernatur reprehenderit, ducimus illo eveniet et quidem itaque
            ipsam error nobis, dolores accusamus!
          </p>
        </div>

        <div className="w-full flex flex-col gap-4 pt-14">
          <div className="rounded-md bg-muted w-full p-4 min-h-32 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <h3 className="md:text-lg">
                Members <span className="px-2">|</span> {teamspace.users.length}
              </h3>
              <CustomModal
                trigger={
                  <Button>
                    <Plus size={16} /> Invite
                  </Button>
                }
                title="Invite to Your Teamspace"
                description="Your invite link has been created. Share this link to join
                    your workspace."
              >
                <div className="space-y-4">
                  <div>
                    <Label>Share link</Label>
                    <div className="flex items-center gap-2">
                      <Input />
                      <Button variant="outline" size="icon">
                        <Copy />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label>Invite user</Label>
                    <div className="flex items-center gap-2">
                      <Input placeholder="Enter email" />
                      <Select>
                        <SelectTrigger className="w-full lg:w-64">
                          <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Label className="pt-1.5">
                      We'll send them instructions and a magic link to join the
                      workspace via email.
                    </Label>
                  </div>

                  <div className="flex gap-2 justify-end pt-6">
                    <Button variant="ghost">Cancel</Button>
                    <Button>Send Invite</Button>
                  </div>
                </div>
              </CustomModal>
            </div>

            {teamspace.users.length > 0 ? (
              <div className="pt-4 flex flex-wrap -space-x-3">
                {teamspace.users.map((teamspace, i) => (
                  <div
                    key={i}
                    className={`bg-primary w-10 h-10 rounded-full flex items-center justify-center font-semibold text-inverted text-lg`}
                  >
                    {teamspace.full_name!.charAt(0)}
                  </div>
                ))}
                {teamspace.users.length > 4 && (
                  <div className="bg-background w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold">
                    +{teamspace.users.length - 4}
                  </div>
                )}
              </div>
            ) : (
              <p>There are no members.</p>
            )}
          </div>
          <div className="rounded-md bg-muted w-full p-4 min-h-32 flex flex-col justify-between">
            <h3 className="md:text-lg">
              Assistant <span className="px-2">|</span>{" "}
              {teamspace.cc_pairs.length}
            </h3>
            <div className="pt-4 flex flex-wrap -space-x-3">
              <div className="bg-primary w-10 h-10 rounded-full flex items-center justify-center font-semibold text-inverted text-lg">
                G
              </div>
              <div className="bg-success w-10 h-10 rounded-full flex items-center justify-center font-semibold text-inverted text-lg">
                J
              </div>
              <div className="bg-warning w-10 h-10 rounded-full flex items-center justify-center font-semibold text-inverted text-lg">
                I
              </div>
              <div className="bg-destructive w-10 h-10 rounded-full flex items-center justify-center font-semibold text-inverted text-lg">
                F
              </div>
              <div className="bg-background w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold">
                +21
              </div>
            </div>
          </div>
          <div className="rounded-md bg-muted w-full p-4 min-h-32 flex flex-col justify-between">
            <h3 className="md:text-lg">
              Document Set <span className="px-2">|</span> 3
            </h3>
            <div className="pt-4 flex flex-wrap gap-2">
              <Badge variant="secondary">
                <Bookmark size={14} /> React
              </Badge>
              <Badge variant="secondary">
                <Bookmark size={14} /> Tailwind
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
