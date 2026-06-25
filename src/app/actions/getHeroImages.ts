"use server";

import fs from "fs/promises";
import path from "path";

export async function getHeroImages() {
  const imgDir = path.join(process.cwd(), "public/images/IMG on Home");
  try {
    const files = await fs.readdir(imgDir);
    // Filter for files that are image files
    const heroFiles = files
      .filter(f => /\.(webp|jpg|jpeg|png)$/i.test(f))
      .map(f => `/images/IMG on Home/${f}`);
      
    // Sort them alphabetically to ensure consistent order
    return heroFiles.sort();
  } catch (error) {
    console.error("Failed to read images directory", error);
    return []; 
  }
}

