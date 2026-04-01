import Image from "next/image";
import Link from "next/link";

export function Brand({
  compact = false,
  sidebar = false,
  href = "/",
}: {
  compact?: boolean;
  sidebar?: boolean;
  href?: string;
}) {
  const height = sidebar ? 28 : compact ? 36 : 42;
  const width = Math.round((height * 1023) / 241);
  const priority = !compact && !sidebar;

  return (
    <Link className="brand" href={href as "/" | "/dashboard"}>
      <Image
        alt="Maze logo"
        priority={priority}
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
