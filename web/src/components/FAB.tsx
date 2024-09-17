import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  BookText,
  CircleHelp,
  Command,
  MessageCircleReply,
} from "lucide-react";
import Link from "next/link";

export function FAB() {
  return (
    <Popover>
      <PopoverTrigger
        asChild
        className="absolute bottom-5 right-5 md:bottom-3 md:right-3 lg:bottom-5 lg:right-5 z-modal hidden md:flex"
      >
        <CircleHelp size={20} />
      </PopoverTrigger>
      <PopoverContent className="w-56 text-sm" side="top" align="end">
        <Link
          href="https://aitable.ai/share/shrTvVrDD0P7HqySRmlp8/fommkqn7v0WUqLGB43"
          className="flex items-center gap-2 py-3 px-4 cursor-pointer rounded-regular hover:bg-primary hover:text-inverted"
          target="_blank"
        >
          <MessageCircleReply size={16} /> Feedback Forms
        </Link>
        <Link
          href=""
          className="flex items-center gap-2 py-3 px-4 cursor-not-allowed rounded-regular hover:bg-primary hover:text-inverted opacity-50 pointer-events-none"
          target="_blank"
        >
          <BookText size={16} /> User Guide & FAQ
        </Link>
        <Link
          href=""
          className="flex items-center gap-2 py-3 px-4 cursor-not-allowed rounded-regular hover:bg-primary hover:text-inverted opacity-50 pointer-events-none"
          target="_blank"
        >
          <Command size={16} /> Shortcut Keys
        </Link>
      </PopoverContent>
    </Popover>
  );
}
