import Image from "next/image";
import { Wrapper } from "./wrapper";
import heroImg from "./assets/usecase.png";
import AIOptions from "./aiOptions";

export default function UseCases() {
  return (
    <Wrapper>
      <div className="w-full pt-32">
        <div className="flex flex-col gap-10">
          <div className="flex flex-col items-center font-semibold">
            <span className="text-[#64A3FF] pb-3">Use Cases</span>
            <h2 className="flex flex-col items-center text-5xl text-black">
              <span>Enterprise-Grade</span>
              <span>AI solutions for your Organization</span>
            </h2>
          </div>

          <Image src={heroImg} alt="heroImg" />
        </div>

        <AIOptions />
      </div>
    </Wrapper>
  );
}
