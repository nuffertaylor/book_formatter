import { parseEpub } from "@gxl/epub-parser";
import { Epub } from "@gxl/epub-parser/lib/parseEpub";

class EpubExtractor {
  file_dir: string;
  epub: Epub | null = null;

  constructor(file_dir: string) {
    this.file_dir = file_dir;
  }

  async init() {
    this.epub = await parseEpub(this.file_dir, { type: "path" });
    if (!this.epub || !this.epub.sections) return;
    for (const section of this.epub.sections) {
      // TODO
    }
  }
}

const extractor = new EpubExtractor("./shadow_over_mars.epub");
extractor.init();

// to run
// ts-node ./epub-extractor.ts
