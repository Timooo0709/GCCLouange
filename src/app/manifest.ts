import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GCC Louange",
    short_name: "GCC Louange",
    description: "Partitions et setlists de louange — église GCC",
    start_url: "/planning",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#EA580C",
    orientation: "portrait",
    icons: [
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
      {
        src: "/icon.png",
        sizes: "any",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.png",
        sizes: "any",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}