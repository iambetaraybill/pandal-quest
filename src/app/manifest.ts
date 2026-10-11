import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pandal Quest",
    short_name: "Pandal Quest",
    description: "Plan a Durga Puja walk in thirty seconds. Then pocket the phone.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf6ea",
    theme_color: "#be241f",
    lang: "en",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
