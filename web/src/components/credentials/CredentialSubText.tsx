export default function CredentialSubText({
  children,
}: {
  children: JSX.Element | string;
}) {
  return (
    <p className="text-sm mb-2 whitespace-break-spaces text-neutral-500">
      {children}
    </p>
  );
}
