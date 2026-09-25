import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Toca y Recuerda",
    short_name: "Toca y Recuerda",
    description: "Convierte tus recuerdos en algo que puedas tocar.",
    start_url: "/",
    display: "standalone",
    background_color: "#F7F4EC",
    theme_color: "#33475B",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
