import Image from "next/image";

// Hero mascot: a cute 3D raccoon eating popcorn, matching the design brief.
// Cropped toward the right side of the source image, where the character
// actually sits (the source has empty gradient space on its left).
export function HeroIllustration() {
  return (
    <div
      aria-hidden
      className="relative aspect-square w-full max-w-xl overflow-hidden rounded-[2.5rem]"
    >
      <Image
        src="/hero-raccoon.png"
        alt=""
        fill
        sizes="(min-width: 768px) 36rem, 100vw"
        className="object-cover object-[80%_center]"
        priority
      />
    </div>
  );
}
