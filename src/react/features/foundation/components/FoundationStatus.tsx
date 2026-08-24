interface FoundationStatusProps {
  label: string;
  value: string;
}

export function FoundationStatus({ label, value }: FoundationStatusProps) {
  return (
    <div className="react-foundation-status">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
