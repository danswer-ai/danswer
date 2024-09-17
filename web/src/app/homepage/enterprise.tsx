import { enterpriseData } from "./data/enterprise";
import { Wrapper } from "./wrapper";

export default function Enterprise() {
  return (
    <Wrapper>
      <div className="flex flex-col w-full gap-10 pt-32">
        <div>
          <p className="text-[#64A3FF]">
            Enterprise-grade security and privacy
          </p>
          <h3 className="pt-3 text-3xl md:text-4xl font-bold text-dark-900 md:w-[600px]">
            Secure AI applications for every Enterprise
          </h3>
          <p className="pt-6 text-xl md:w-[700px] leading-relaxed">
            We prioritize security and privacy for your company. Ensure safe
            connectivity with your databases, while maintaining stringent
            controls over data processing.
          </p>
        </div>

        <div className="grid text-lg md:grid-cols-2 gap-y-6 gap-x-12">
          {enterpriseData.map((data, i) => (
            <div key={i}>
              <p>
                <strong className="text-dark-900">{data.title}</strong>{" "}
                {data.details}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Wrapper>
  );
}
