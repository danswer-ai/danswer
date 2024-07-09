import { enterpriseData } from "./data/enterprise";
import { Wrapper } from "./wrapper";

import aws from "./assets/aws.webp";
import onedrive from "./assets/onedrive-logo.webp";
import googleCloud from "./assets/google_cloud.webp";
import sharepoint from "./assets/sharepoint.svg";
import bigquery from "./assets/bigquery-logo-no-letters.webp";
import slack from "./assets/slack.webp";
import azure from "./assets/azure-no-letters.webp";
import notion from "./assets/notion.webp";
import snowflake from "./assets/snowflake.svg";
import Image from "next/image";

const icons = [
  aws,
  onedrive,
  googleCloud,
  sharepoint,
  bigquery,
  slack,
  azure,
  notion,
  snowflake,
];

export default function DataLoaders() {
  return (
    <Wrapper>
      <div className="flex flex-col items-center w-full gap-16 pt-32 lg:gap-40 lg:flex-row">
        <div className="lg:w-1/2">
          <p className="text-[#64A3FF] font-semibold">Data loaders</p>
          <h3 className="pt-3 text-3xl font-bold text-black md:text-4xl">
            Connect with your Data, wherever it sits...
          </h3>
          <p className="pt-6 text-xl leading-relaxed">
            Seamlessly connect to your data using our suite of integrations with
            popular data storage solutions such as AWS S3, Sharepoint, OneDrive,
            Snowflake, Azure, and many more...
          </p>
        </div>

        <div className="grid grid-cols-3 gap-20 md:gap-x-40 lg:gap-x-20 lg:w-1/2">
          {icons.map((icon, i) => (
            <Image src={icon} alt={`icon-${i}`} key={i} width={60} />
          ))}
        </div>
      </div>
    </Wrapper>
  );
}
