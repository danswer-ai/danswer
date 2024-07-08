import Image from "next/image";
import { Wrapper } from "./wrapper";
import heroImg from "../../../public/login_page_img.webp";
import placeholder from "../../../public/placeholder.svg";

export default function Hero() {
  return (
    <Wrapper>
      <div className="flex flex-col w-full gap-24 pt-20">
        <div className="flex items-center justify-between w-full">
          <div className="flex flex-col w-1/2 gap-6 text-lg">
            <h1 className="font-bold text-black text-7xl">
              The Enterprise Generative AI Platform{" "}
            </h1>
            <div>
              <p>Augment your workforce with AI Assistants.</p>
              <p>Automate back office operations.</p>
              <p>Make your organization smarter.</p>
            </div>

            <div className="flex items-center font-semibold gap-14">
              <button className="py-3 px-6 bg-[#2039F3] text-white rounded-[5px]">
                Get a Demo
              </button>
              <button className="text-[#2039F3]">Start for free</button>
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
