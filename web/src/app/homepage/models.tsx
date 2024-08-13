import Image from "next/image";
import { Wrapper } from "./wrapper";
import placeholder from "../../../public/placeholder.svg";

export default function Models() {
  return (
    <Wrapper>
      <div className="flex flex-col items-center w-full gap-20 pt-32">
        <h3 className="text-3xl font-bold text-dark-900 md:text-4xl">
          Access State-of-the-Art AI Models
        </h3>

        <div className="grid w-full grid-cols-4 gap-20">
          <Image src={placeholder} alt="placeholder" />
          <Image src={placeholder} alt="placeholder" />
          <Image src={placeholder} alt="placeholder" />
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
