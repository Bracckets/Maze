import Image from "next/image";
import Link from "next/link";

const LOGO_WIDTH = 380;
const LOGO_HEIGHT = 72;

export function Brand({
  compact = false,
  sidebar = false,
  href = "/",
}: {
  compact?: boolean;
  sidebar?: boolean;
  href?: string;
}) {
  const height = sidebar ? 32 : compact ? 28 : 30;
  const width = Math.round((height * LOGO_WIDTH) / LOGO_HEIGHT);

  return (
    <Link className="brand" href={href as "/" | "/dashboard"}>
      <Image
        alt="Pollex logo"
        priority={!compact}
        src="/logo.png"
        width={width}
        height={height}
      />
    </Link>
  );
}

export function OrbitMark() {
  return null;
}
