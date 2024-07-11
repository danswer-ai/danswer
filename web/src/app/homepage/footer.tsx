import enmeddLogo from "../../../public/logo-brand.png";
import Image from "next/image";
import { Wrapper } from "./wrapper";

import SOC from "./assets/SOC2_white.webp";
import GDPR from "./assets/gdpr-logo-2.webp";
import HIPAA from "./assets/hipaa_blue.webp";

import twitter from "./assets/twitter-icon.svg";
import github from "./assets/github-icon.svg";
import linkedin from "./assets/linkedin-icon.svg";

export default function Footer() {
  return (
    <div className="w-full pt-6 pb-12 border-t">
      <Wrapper>
        <div className="flex flex-col w-full gap-32 xl:gap-40">
          <div className="flex flex-col justify-between w-full gap-10 xl:flex-row">
            <div className="flex flex-col gap-3">
              <Image src={enmeddLogo} alt="enmedd-logo" width={150} />
              <p>Build and Deploy AI Applications in minutes</p>

              <div className="flex flex-col gap-6 md:gap-10 md:flex-row xl:gap-6 xl:flex-col">
                <div className="flex items-center gap-4">
                  <Image src={twitter} alt="twitter" width={25} />
                  <Image src={github} alt="github" width={25} />
                  <Image src={linkedin} alt="linkedin" width={25} />
                </div>

                <div className="flex items-center gap-4">
                  <Image src={SOC} alt="SOC" width={70} />
                  <Image src={GDPR} alt="GDPR" width={70} />
                  <Image src={HIPAA} alt="HIPAA" width={100} />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-between gap-10 xl:gap-20">
              <div className="flex flex-col gap-3">
                <span className="font-semibold text-black">Solutions</span>
                <ul className="flex flex-col gap-2.5">
                  <li className="cursor-pointer">Enterprise</li>
                  <li className="cursor-pointer">SMB</li>
                  <li className="cursor-pointer">Startups</li>
                  <li className="cursor-pointer">Agencies</li>
                  <li className="cursor-pointer">AI Assistants</li>
                  <li className="cursor-pointer">Automations</li>
                  <li className="cursor-pointer">Chatbots</li>
                  <li className="cursor-pointer">Healthcare</li>
                  <li className="cursor-pointer">Operations</li>
                  <li className="cursor-pointer">Education</li>
                  <li className="cursor-pointer">Government</li>
                </ul>
              </div>
              <div className="flex flex-col gap-3">
                <span className="font-semibold text-black">Support</span>
                <ul className="flex flex-col gap-2.5">
                  <li className="cursor-pointer">Pricing</li>
                  <li className="cursor-pointer">Documentation</li>
                  <li className="cursor-pointer">Tutorials</li>
                  <li className="cursor-pointer">Status Page</li>
                  <li className="cursor-pointer">Changelog</li>
                </ul>
              </div>
              <div className="flex flex-col gap-3">
                <span className="font-semibold text-black">Company</span>
                <ul className="flex flex-col gap-2.5">
                  <li className="cursor-pointer">About</li>
                  <li className="cursor-pointer">Blog</li>
                  <li className="cursor-pointer">Careers</li>
                  <li className="cursor-pointer">Stack AI Affiliate</li>
                  <li className="cursor-pointer">Stack AI Certified</li>
                  <li className="cursor-pointer">Security</li>
                </ul>
              </div>
              <div className="flex flex-col gap-3">
                <span className="font-semibold text-black">Legal</span>
                <ul className="flex flex-col gap-2.5">
                  <li className="cursor-pointer">Privacy</li>
                  <li className="cursor-pointer">Terms</li>
                  <li className="cursor-pointer">Referral Terms</li>
                  <li className="cursor-pointer">OpenAI DPA</li>
                  <li className="cursor-pointer">Anthropic DPA</li>
                  <li className="cursor-pointer">SOC 2 Report</li>
                  <li className="cursor-pointer">Sign BAA with us</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between w-full md:flex-row">
            <p className="col-span-1 leading-5 text-gray-500">
              © 2024{" "}
              <a className="hover:underline" href="/">
                {" "}
                enMedD
              </a>
              . All Rights Reserved.
            </p>

            <p className="col-span-1 text-gray-500">
              Made with
              <span className="self-center mx-1 opacity-50 grayscale hover:opacity-90 hover:grayscale-0">
                ❤️
              </span>
              by <span className="inline-flex items-baseline">PhDs</span>
            </p>
          </div>
        </div>
      </Wrapper>
    </div>
  );
}
