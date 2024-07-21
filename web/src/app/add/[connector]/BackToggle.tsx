import { Button } from "@tremor/react";

export type buttonType = {
  text: string;
  onClick: () => void;
};
export default function BackToggle({
  button1,
  button2,
  advanced,
}: {
  button1?: buttonType;
  button2?: buttonType;
  advanced?: boolean;
}) {
  return (
    <div className="flex mt-8 flex-col mb-12">
      <div className="  flex w-full justify-between">
        {button1 && (
          <Button color="teal" className="mr-auto" onClick={button1.onClick}>
            {button1.text}
          </Button>
        )}
        {button2 && (
          <Button color="green" className="ml-auto" onClick={button2.onClick}>
            {button2.text}
          </Button>
        )}
      </div>

      {advanced && <button className="ml-auto">Advanced</button>}
    </div>
  );
}
