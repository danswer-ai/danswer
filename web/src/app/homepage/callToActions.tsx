import { Wrapper } from "./wrapper";

export default function CallToActions() {
  return (
    <Wrapper>
      <div className="w-full py-32">
        <div className="relative flex flex-col items-center gap-6 md:p-28 overflow-hidden rounded-xl md:rounded-3xl bg-[rgb(17,_24,_39)] isolate p-10">
          <h3 className="text-3xl text-center text-inverted md:text-4xl">
            A plan to fit your needs
          </h3>

          <p className="pb-4 text-[rgb(222,222,230)] text-lg text-center">
            Deploy secure and powerful AI applications in minutes
          </p>

          <button className="py-3 px-6 bg-[#2039F3] text-inverted rounded-[5px] text-xl font-semibold">
            Get a Demo
          </button>

          <div className="absolute right-0 -top-24 -z-10 transform-gpu blur-3xl">
            <div
              className="aspect-[1404/767] w-[87.75rem] bg-gradient-to-r from-[#80caff] to-blue-800 opacity-50"
              style={{
                clipPath:
                  "polygon(73.6% 51.7%, 91.7% 11.8%, 100% 46.4%, 97.4% 82.2%, 92.5% 84.9%, 75.7% 64%, 55.3% 47.5%, 46.5% 49.4%, 45% 62.9%, 50.3% 87.2%, 21.3% 64.1%, 0.1% 100%, 5.4% 51.1%, 21.4% 63.9%, 58.9% 0.2%, 73.6% 51.7%)",
              }}
            />
          </div>
        </div>
      </div>
    </Wrapper>
  );
}
