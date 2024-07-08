import Image from "next/image";
import { certificationData } from "./data/certification";
import { Wrapper } from "./wrapper";

export default function Certifications() {
  return (
    <Wrapper>
      <div className="flex flex-col items-center w-full gap-16 pt-32">
        <div className="flex flex-col gap-10">
          <h4 className="text-2xl font-semibold text-[#2039F3]">
            Certifications
          </h4>

          <div className="flex gap-10">
            {certificationData.map((data, i) => (
              <div
                key={i}
                className="flex flex-col gap-8 bg-[rgba(177,177,183,0.1)] rounded-[5px] p-6"
              >
                <div className="flex justify-between">
                  <span>{data.type}</span>
                  <div className="h-24">
                    <Image
                      src={data.image}
                      alt={data.type}
                      className="w-full h-full"
                    />
                  </div>
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-black">
                    {data.title}
                  </h4>
                  <p className="pt-2 text-[rgba(14,_14,_15,_0.5)]">
                    {data.details}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button className="py-3 px-6 bg-[#2039F3] text-white rounded-[5px] text-xl font-semibold">
          Learn more
        </button>
      </div>
    </Wrapper>
  );
}
