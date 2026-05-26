import * as fs from "fs";
import * as path from "path";
import { pinyin } from "pinyin-pro";

const SONGS_DIR = path.join(process.cwd(), "content", "songs");

// Helper to check if string contains Chinese characters
function hasChinese(text: string): boolean {
  return /[一-鿿]/.test(text);
}

// Helper to convert pinyin with tones to a clean URL-friendly slug
function slugifyPinyin(pinyinStr: string): string {
  return pinyinStr
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove diacritics / tones
    .replace(/[^a-z0-9\s-]/g, "")    // remove special chars
    .trim()
    .replace(/\s+/g, "-")            // replace spaces with hyphens
    .replace(/-+/g, "-")             // collapse multiple hyphens
    .replace(/^-|-$/g, "");          // trim leading/trailing hyphens
}

function main() {
  console.log("Starting renaming process for Chinese song files...");
  
  if (!fs.existsSync(SONGS_DIR)) {
    console.error(`Directory not found: ${SONGS_DIR}`);
    return;
  }

  const files = fs.readdirSync(SONGS_DIR).filter((f) => f.endsWith(".cho") && !f.startsWith("_"));
  let renameCount = 0;

  for (const file of files) {
    const filenameNoExt = file.replace(/\.cho$/, "");
    
    // Only rename if the filename contains Chinese characters
    if (hasChinese(filenameNoExt)) {
      const filePath = path.join(SONGS_DIR, file);
      const content = fs.readFileSync(filePath, "utf-8");
      
      // Try to extract title_pinyin
      const pinyinMatch = content.match(/\{title_pinyin:\s*(.*?)\}/i);
      const titleMatch = content.match(/\{title:\s*(.*?)\}/i);
      
      let pinyinSource = "";
      
      if (pinyinMatch && pinyinMatch[1].trim()) {
        pinyinSource = pinyinMatch[1].trim();
      } else if (titleMatch && titleMatch[1].trim()) {
        const title = titleMatch[1].trim();
        // Fallback to generating pinyin from title
        pinyinSource = pinyin(title, { toneType: "none", type: "string" });
      } else {
        // Fallback to converting filename to pinyin
        pinyinSource = pinyin(filenameNoExt, { toneType: "none", type: "string" });
      }
      
      const newSlug = slugifyPinyin(pinyinSource);
      const newFilename = `${newSlug}.cho`;
      
      if (newFilename !== file) {
        const newFilePath = path.join(SONGS_DIR, newFilename);
        
        // Handle duplicate resolution
        let finalPath = newFilePath;
        let finalFilename = newFilename;
        let counter = 1;
        while (fs.existsSync(finalPath)) {
          finalFilename = `${newSlug}-${counter}.cho`;
          finalPath = path.join(SONGS_DIR, finalFilename);
          counter++;
        }
        
        console.log(`Renaming: "${file}" -> "${finalFilename}"`);
        fs.renameSync(filePath, finalPath);
        renameCount++;
      }
    }
  }
  
  console.log(`✓ Process completed. Renamed ${renameCount} Chinese song files.`);
}

main();
