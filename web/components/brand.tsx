import Image from "next/image";
import Link from "next/link";

export function Brand({ compact = false, sidebar = false }: { compact?: boolean; sidebar?: boolean }) {
  const height = sidebar ? 32 : compact ? 40 : 54;
  const width = sidebar ? 120 : compact ? 132 : 180;

  return (
    <Link className="brand" href="/">
      <Image
        alt="Maze logo"
        priority
        src="/logo.png"
        width={width}
        height={height}
        style={{ width: "auto", height }}
      />
    </Link>
  );
}

export function OrbitMark() {
  return null;
}
