export default function CredentialSubText({
  children,
}: {
  children: JSX.Element | string;
}) {
  return <p className="text-sm mb-2 text-neutral-600">{children}</p>;
}
