import { HeaderTitle } from "@/components/header/Header";
import { Logo } from "@/components/Logo";

export default function FixedLogo() {
  return (
    <div className="fixed flex z-40 left-4 top-2">
      {" "}
      <a href="/chat" className="ml-7 text-text-700 text-xl">
        <HeaderTitle>Danswer</HeaderTitle>
      </a>
    </div>
  );
}
