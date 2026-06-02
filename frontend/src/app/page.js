import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-black text-white">
      <Image
        src="/picture/baad-hero-background.png"
        alt="BAAD aerial architecture hero"
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />

      <div className="absolute left-[2vw] top-[5.6vh] z-10 max-w-[52vw] font-display text-[clamp(1.15rem,1.9vw,2.15rem)] leading-none">
        Boundary AI Architectural Design
      </div>

      <div className="absolute right-[1.6vw] top-[5.4vh] z-10 max-w-[42vw] text-right text-white">
        <div className="font-sans text-[clamp(1.15rem,1.9vw,2.15rem)] font-medium leading-none">
          极光工作室
        </div>
        <div className="mt-3 font-sans text-[clamp(0.8rem,1.35vw,1.55rem)] font-medium uppercase leading-none">
          AURORA STUDIO
        </div>
      </div>

      <Link
        href="/render"
        className="absolute left-1/2 top-[65%] z-10 -translate-x-1/2 whitespace-nowrap text-center text-[clamp(2.1rem,4vw,4.5rem)] leading-none text-white transition duration-200 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        style={{ fontFamily: '"Monotype Corsiva", cursive' }}
      >
        BEGIN DESIGNING
      </Link>
    </section>
  );
}
