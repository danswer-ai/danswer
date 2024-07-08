import Image from "next/image";
import { Wrapper } from "./wrapper";
import heroImg from "../../../public/login_page_img.webp";
import placeholder from "../../../public/placeholder.svg";

export default function Hero() {
  return (
    <Wrapper>
      <div className="flex flex-col w-full gap-24 pt-32">
        <div className="flex items-center justify-between w-full">
          <div className="flex flex-col w-1/2 gap-6 text-lg">
            <h1 className="font-bold text-black text-7xl">
              The Enterprise{" "}
              <span className="text-[#2039F3]">Generative AI</span> Platform{" "}
            </h1>
            <div>
              <p>
                <strong className="text-[#2039F3]">Augment</strong> your
                workforce with{" "}
                <strong className="text-[#2039F3]">AI Assistants.</strong>
              </p>
              <p>
                <strong className="text-[#2039F3]">Automate</strong> back office
                operations.
              </p>
              <p>
                Make your organization{" "}
                <strong className="text-[#2039F3]">smarter.</strong>
              </p>
            </div>

            <div className="flex items-center gap-6 font-semibold">
              <button className="py-3 px-6 bg-[#2039F3] text-white rounded-[5px]">
                Get a Demo
              </button>
              <button className="text-[#2039F3] py-3 px-6 hover:bg-[#D7EAFF] rounded-[5px] transition-all duration-500 ease-in-out">
                Start for free
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center w-1/2">
            <Image src={heroImg} alt="hero-img" className="w-3/4" />
          </div>
        </div>

        <div className="flex items-start justify-between w-full gap-5">
          <Image src={placeholder} alt="placeholder" />
          <Image src={placeholder} alt="placeholder" />
          <Image src={placeholder} alt="placeholder" />
          <Image src={placeholder} alt="placeholder" />
          <Image src={placeholder} alt="placeholder" />
        </div>
      </div>
    </Wrapper>
  );
}
