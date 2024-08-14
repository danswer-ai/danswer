import Image from "next/image";
import { Wrapper } from "./wrapper";
import heroImg from "./assets/usecase.png";

import { platformData } from "./data/platform";

export default function Platform() {
  return (
    <Wrapper>
      <div className="flex flex-col items-center w-full gap-12 pt-32">
        <div className="flex flex-col w-full gap-10">
          <div className="flex flex-col font-bold md:items-center">
            <span className="text-[#64A3FF] pb-3">Platform</span>
            <h2 className="flex flex-col text-4xl text-dark-900 md:text-5xl md:items-center">
              <span>A User-Friendly </span>
              <span>Interface to Build AI Solutions</span>
            </h2>
          </div>

          <div className="flex items-center gap-6 lg:mr-[8.5rem] flex-col lg:flex-row">
            <div className="flex gap-4 text-sm md:text-lg lg:flex-col">
              <button className="bg-primary-300 text-[#64A3FF] hover:opacity-50 p-2 md:px-4 md:py-4 rounded-[5px]">
                Workflow
              </button>
              <button className="hover:bg-[rgba(14,_14,_15,_0.1)] px-2 md:px-4 md:py-4 rounded-[5px]">
                Export
              </button>
              <button className="hover:bg-[rgba(14,_14,_15,_0.1)] px-2 md:px-4 md:py-4 rounded-[5px]">
                Analytics
              </button>
              <button className="hover:bg-[rgba(14,_14,_15,_0.1)] px-2 md:px-4 md:py-4 rounded-[5px]">
                Manager
              </button>
            </div>
            <Image
              src={heroImg}
              alt="heroImg"
              className="w-full lg:h-[650px]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-10 lg:mx-[8.5rem]">
          {platformData.map((data, i) => (
            <div key={i}>
              <h4 className="text-xl font-semibold text-dark-900">
                {data.title}
              </h4>
              <p>{data.details}</p>
            </div>
          ))}
        </div>

        <button className="py-3 px-6 bg-[#2039F3] text-white rounded-[5px] font-semibold  text-lg">
          Get a Demo
        </button>
      </div>
    </Wrapper>
  );
}
