import Image from "next/image";
import { Wrapper } from "./wrapper";
import heroImg from "../../../public/login_page_img.webp";
import placeholder from "../../../public/placeholder.svg";
import Link from "next/link";

export default function Hero() {
  return (
    <Wrapper>
      <div className="flex flex-col w-full gap-24 pt-32">
        <div className="flex items-center justify-between w-full">
          <div className="flex flex-col items-center gap-6 text-lg lg:w-1/2 lg:items-start">
            <h1 className="text-5xl font-bold text-center text-dark-900 md:w-3/4 md:text-6xl lg:text-7xl lg:text-start lg:w-full">
              The Enterprise{" "}
              <span className="text-[#2039F3]">Generative AI</span> Platform{" "}
            </h1>
            <div className="flex flex-col items-center justify-center lg:items-start lg:justify-start">
              <p className="text-center lg:text-start">
                <strong className="text-dark-900">Augment</strong> your
                workforce with{" "}
                <strong className="text-dark-900">AI Assistants.</strong>
              </p>
              <p className="text-center lg:text-start">
                <strong className="text-dark-900">Automate</strong> back office
                operations.
              </p>
              <p className="text-center lg:text-start">
                Make your organization{" "}
                <strong className="text-dark-900">smarter.</strong>
              </p>
            </div>

            <div className="flex items-center gap-6 font-semibold">
              <button className="py-3 px-6 bg-[#2039F3] text-white rounded-[5px]">
                Get a Demo
              </button>
              <Link
                href="/chat"
                className="text-[#2039F3] py-3 px-6 hover:bg-primary-300 rounded-[5px] transition-all duration-500 ease-in-out"
              >
                Start for free
              </Link>
            </div>
          </div>

          <div className="items-center justify-center hidden w-1/2 lg:flex">
            <Image src={heroImg} alt="hero-img" className="w-3/4" />
          </div>
        </div>

        <div className="flex flex-wrap items-start justify-between w-full gap-5">
          <Image src={placeholder} alt="placeholder" />
          <Image src={placeholder} alt="placeholder" />
          <Image src={placeholder} alt="placeholder" />
          <Image src={placeholder} alt="placeholder" />
        </div>
      </div>
    </Wrapper>
  );
}
