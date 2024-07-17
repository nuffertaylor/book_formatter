const jsdom = require("jsdom");
var unzipper = require("unzipper");
const fs = require("fs");

class EpubExtractor {
  file_dir = null;

  constructor() {
    let prevVal = "";
    for (const val of process.argv) {
      switch (prevVal) {
        case "-file": // provide directory of epub file to parse
          this.file_dir = val;
          break;
      }
      prevVal = val;
    }
  }

  async parse() {
    if (this.file_dir == null) {
      console.log("No epub file provided. Specify directory using -file.");
      process.exit();
    }

    if (!fs.existsSync(this.file_dir)) {
      console.log("provided file: " + this.file_dir + " does not exist.");
      process.exit();
    }

    // extract epub to temp directory
    const directory = await unzipper.Open.file(this.file_dir);
    await directory.extract({ path: "temp" });

    // find all .html files
    const files = fs.readdirSync("temp").filter((str) => str.includes(".html"));

    for (const filePath of files) {
      const fileText = fs.readFileSync("temp/" + filePath, "utf-8");
      const res = this.getChapterDetails(fileText);
    }

    // h1 is the chapter title

    // i is italic

    // the rest is plain

    // epubParser.open(this.file_dir, (err, epubData) => {
    //   if (err) {
    //     return console.log(err);
    //   }
    //   this.epub = epubData;
    //   const itemHashByHref = this.epub.easy.itemHashByHref;
    //   for (const [key, value] of Object.entries(itemHashByHref)) {
    //     console.log(`${key}: ${value}`);
    //     console.log(value);
    //   }
    // });
  }

  getChapterDetails(html) {
    const domDocument = new jsdom.JSDOM(html).window.document;
    // Remove script and style tags
    const elements = domDocument.querySelectorAll("script, style");
    elements.forEach((element) => element.parentNode.removeChild(element));

    // get chapter title from h1
    const h1query = domDocument.querySelector("h1");
    if (h1query != null) {
      console.log(h1query.innerHTML);
    }

    // get array of paragraphs from p tag (just keep italics for now)
    const ps = domDocument.querySelector("p");

    domDocument.body.textContent.trim();
  }
}

const extractor = new EpubExtractor();
extractor.parse();

// to run
// node ./epub-extractor.js -file "./free-wrench.epub"
