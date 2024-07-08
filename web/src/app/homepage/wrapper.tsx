import { ReactNode } from "react";

interface WrapperProps {
  children: ReactNode;
}

export function Wrapper({ children }: WrapperProps) {
  return (
    <div className="flex items-center justify-center w-full">
      <div className="2xl:w-[1200px] flex items-center justify-center relative">
        {children}
      </div>
    </div>
  );
}
