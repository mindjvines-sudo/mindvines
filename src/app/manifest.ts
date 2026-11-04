import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.name,
    description: siteConfig.description,
    start_url: "/",
    display: "standalone",
    background_color: "#fdf9f2",
    theme_color: "#fcf5e5",
    icons: [{ src: "/icon.png", sizes: "512x512", type: "image/png" }],
  };
}
