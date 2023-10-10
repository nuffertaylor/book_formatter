const EPub = require("epub");
const xml2js = require("xml2js");

class EpubExtractor {
  epub;

  constructor(file_dir) {
    this.epub = new EPub(file_dir);
    this.epub.on("end", this.loaded);
    this.epub.parse();
  }

  loaded = async () => {
    const chapterIds = this.epub.flow.map((chapter) => chapter.id);

    let x = 0;
    for (const id of chapterIds) {
      this.epub.getChapter(id, function (err, text) {
        xml2js
          .parseStringPromise(text /*, options */)
          .then(function (result) {
            console.dir(result.h1.b);
            console.log("Done");
          })
          .catch(function (err) {
            // Failed
          });
      });
      x += 1;
    }
  };
}

const extractor = new EpubExtractor("./shadow_over_mars.epub");
