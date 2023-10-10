import { parseEpub } from "@gxl/epub-parser";
import { Epub } from "@gxl/epub-parser/lib/parseEpub";

class EpubExtractor {
  file_dir: string;
  epub: Epub | null = null;
  content: string[] = [];

  constructor(file_dir: string) {
    this.file_dir = file_dir;
  }

  async init() {
    this.epub = await parseEpub(this.file_dir, { type: "path" });
    if (!this.epub || !this.epub.sections) return;
    for (const section of this.epub.sections) {
      // @ts-ignore - no idea why but this line won't compile without this
      this.content.push(section.toMarkdown() as string);
    }
    console.log(this.content.length);
    console.log(this.content[8]);
  }
}

const extractor = new EpubExtractor("./shadow_over_mars.epub");
extractor.init();

// to run
// ts-node ./epub-extractor.ts
