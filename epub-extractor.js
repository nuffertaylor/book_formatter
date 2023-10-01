const EPub = require("epub");

class EpubExtractor {
  epub;

  constructor(file_dir) {
    this.epub = new EPub(file_dir);
    this.epub.on("end", this.loaded);
    this.epub.parse();
  }

  loaded = async () => {
    const chapterIds = this.epub.flow.map((chapter) => chapter.id);

    for (const id of chapterIds) {
      this.epub.getChapter(id, function (err, text) {
        console.log(text);
      });
    }
  };
}

const extractor = new EpubExtractor("./the_prince.epub");
