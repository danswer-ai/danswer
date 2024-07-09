import { HeaderTitle } from "@/components/header/Header";
import { Logo } from "@/components/Logo";

export default function FixedLogo() {
  return (
    <div className="absolute flex z-50 left-4 top-2">
      {" "}
      {/* <Logo /> */}
      <div className="ml-7 text-solid text-xl">
        <HeaderTitle>Danswer</HeaderTitle>
      </div>
    </div>
  );
}
