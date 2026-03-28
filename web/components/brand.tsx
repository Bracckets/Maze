import Image from "next/image";
import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="brand" href="/">
      <Image alt="Maze logo" className="brand-logo" height={compact ? 40 : 52} priority src="/logo.png" width={compact ? 144 : 188} />
    </Link>
  );
}

export function OrbitMark() {
  return <span className="orbit-mark" aria-hidden="true" />;
}
