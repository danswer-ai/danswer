import { CustomTooltip } from "@/components/CustomTooltip";
import { Teamspace } from "@/lib/types";
import { ChevronLeft, ChevronRight, PanelRightClose } from "lucide-react";
import { TeamspaceSidebarContent } from "./TeamspaceSidebarContent";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface TeamspaceSidebarProps {
  selectedTeamspace?: Teamspace;
  generateGradient: (teamspaceName: string) => string;
  onClose: () => void;
  isExpanded: boolean;
}

export const TeamspaceSidebar = ({
  selectedTeamspace,
  generateGradient,
  onClose,
  isExpanded,
}: TeamspaceSidebarProps) => {
  return (
    <>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className={`fixed w-full h-full bg-background-inverted bg-opacity-20 inset-0 z-overlay lg:hidden`}
            initial={{ opacity: 0 }}
            animate={{ opacity: isExpanded ? 1 : 0 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.2,
              opacity: { delay: isExpanded ? 0 : 0.3 },
            }}
            style={{ pointerEvents: isExpanded ? "auto" : "none" }}
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <div
        className={`fixed flex-none h-full z-overlay top-0 right-0 transition-all ease-in-out duration-500 overflow-hidden lg:overflow-visible lg:relative ${
          isExpanded
            ? "translate-x-0 w-[85vw] md:w-[450px]"
            : "translate-x-full w-0"
        }`}
      >
        {isExpanded && (
          <div className="h-full flex items-center justify-center absolute right-full">
            <CustomTooltip
              trigger={
                <button
                  className="border rounded-l py-2 border-r-0 bg-background hidden lg:flex"
                  onClick={onClose}
                >
                  <ChevronRight size={16} />
                </button>
              }
              asChild
              side="left"
            >
              Close
            </CustomTooltip>
          </div>
        )}

        <div
          className={`h-full bg-background border-l w-full transition-opacity duration-300 ease-in-out overflow-y-auto relative ${
            isExpanded ? "lg:opacity-100 delay-300" : "lg:opacity-0"
          }`}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 left-4 z-overlay lg:hidden"
            onClick={onClose}
          >
            <PanelRightClose stroke="#ffffff" />
          </Button>
          {selectedTeamspace && (
            <TeamspaceSidebarContent
              teamspace={{
                ...selectedTeamspace,
                gradient: generateGradient(selectedTeamspace.name),
              }}
              selectedTeamspaceId={selectedTeamspace.id}
            />
          )}
        </div>
      </div>
    </>
  );
};
