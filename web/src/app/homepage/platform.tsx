import Image from "next/image";
import { Wrapper } from "./wrapper";
import heroImg from "./assets/usecase.png";

import { platformData } from "./data/platform";

export default function Platform() {
  return (
    <Wrapper>
      <div className="flex flex-col items-center w-full gap-12 pt-20">
        <div className="flex flex-col w-full gap-10">
          <div className="flex flex-col items-center font-semibold">
            <span className="text-[#64A3FF] pb-3">Platform</span>
            <h2 className="flex flex-col items-center text-5xl text-black">
              <span>A User-Friendly </span>
              <span>Interface to Build AI Solutions</span>
            </h2>
          </div>

          <div className="flex items-center gap-6 mr-[8.5rem]">
            <div className="flex flex-col gap-4 text-lg">
              <button className="bg-[#D7EAFF] text-[#64A3FF] hover:opacity-50 px-4 py-4 rounded-[5px]">
                Workflow
              </button>
              <button className="hover:bg-[rgba(14,_14,_15,_0.1)] px-4 py-4 rounded-[5px]">
                Export
              </button>
              <button className="hover:bg-[rgba(14,_14,_15,_0.1)] px-4 py-4 rounded-[5px]">
                Analytics
              </button>
              <button className="hover:bg-[rgba(14,_14,_15,_0.1)] px-4 py-4 rounded-[5px]">
                Manager
              </button>
            </div>
            <Image src={heroImg} alt="heroImg" className="w-full h-[650px]" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-10 mx-[8.5rem]">
          {platformData.map((data, i) => (
            <div key={i}>
              <h3 className="text-xl font-semibold text-black">{data.title}</h3>
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
