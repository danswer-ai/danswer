import { ReactNode } from "react";

interface WrapperProps {
  children: ReactNode;
}

export function Wrapper({ children }: WrapperProps) {
  return (
    <div className="flex items-center justify-center w-full">
      <div className="2xl:w-[1200px] flex items-center justify-center relative w-full px-6 sm:px-10 md:px-12 lg:px-16 xl:px-0">
        {children}
      </div>
    </div>
  );
}
