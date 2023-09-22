const PDFDocument = require("pdfkit");
const fs = require("fs");
const { readFile } = require("fs/promises");

const A4_WIDTH = 841.89;
const A4_HEIGHT = 595.28;
const A4_RATIO = 76;
const PAGE_DIVIDER = A4_WIDTH / 2;
const CENTER_PAGE_LEFT = A4_WIDTH / 4;
const CENTER_PAGE_RIGHT = CENTER_PAGE_LEFT + PAGE_DIVIDER;
const CONTENT_BLOCK_HEIGHT = A4_HEIGHT - A4_RATIO * 2;
const CONTENT_BLOCK_WIDTH = PAGE_DIVIDER - A4_RATIO * 2;

const inchesToPDFKit = (inches) => {
  return A4_RATIO * inches;
};

class BookFormatter {
  doc; // PDFDocument
  filename = "output.pdf"; // string
  headerMarginX = 0.5; // float, in inches
  headerMarginY = 0.5; // float, in inches
  curPage = 0; // int
  onHeaderPage = false; // boolean

  constructor() {
    // Create a document
    // A4 (841.89 x 595.28)
    this.doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      font: "fonts/FrankRuhlLibre-Regular.ttf",
      fontSize: 12,
      margins: {
        top: inchesToPDFKit(1),
        left: inchesToPDFKit(0.5),
        right: inchesToPDFKit(0.5),
        bottom: inchesToPDFKit(0.5),
      },
    });

    // procss terminal parameters
    let prevVal = "";
    process.argv.forEach(function (val, index) {
      // 'fn' flag to add custom filename
      if (prevVal === "-fn") {
        // fn = FileName
        this.filename = val;
        if (
          this.filename.slice(
            this.filename.length - 4,
            this.filename.length
          ) !== ".pdf"
        ) {
          this.filename += ".pdf";
        }
      }
      if (prevVal === "-sp") {
        // sp = Starting Page
        if (!isNaN(val)) {
          this.curPage = Math.floor(val);
        }
      }
      prevVal = val;
    });

    this.doc.pipe(fs.createWriteStream(this.filename));
  }

  writePageNumberLeft = (num) => {
    this.doc
      .fontSize(12)
      .text(
        num,
        inchesToPDFKit(this.headerMarginX),
        inchesToPDFKit(this.headerMarginY)
      );
  };

  writePageNumberRight = (num) => {
    this.doc
      .fontSize(12)
      .text(
        num,
        A4_WIDTH -
          inchesToPDFKit(this.headerMarginX) -
          this.doc.widthOfString(num),
        inchesToPDFKit(this.headerMarginY)
      );
  };

  writeHeaderTitleLeft = (header) => {
    const headerWidth = this.doc.widthOfString(header);
    this.doc
      .fontSize(12)
      .text(
        header,
        CENTER_PAGE_LEFT - headerWidth / 2,
        inchesToPDFKit(this.headerMarginY)
      );
  };

  writeHeaderTitleRight = (header) => {
    const headerWidth = this.doc.widthOfString(header);
    this.doc
      .fontSize(12)
      .text(
        header,
        CENTER_PAGE_RIGHT - headerWidth / 2,
        inchesToPDFKit(this.headerMarginY)
      );
  };

  writeChapterHeader = (header) => {
    this.doc
      .fontSize(32)
      .text(header, PAGE_DIVIDER + inchesToPDFKit(1), inchesToPDFKit(1));
    this.onHeaderPage = true;
  };

  writeChapterContents = (contents) => {
    // each newline should represent a single paragraph.
    // filter out empty lines.
    const paragraphs = contents.split(`\n`).filter((p) => !!p);
    console.log(paragraphs.length);
    this.writePageContentRight(paragraphs.join(`\n`));
  };

  writePageContentLeft = (content) => {};

  writePageContentRight = (content) => {
    this.doc
      .fontSize(12)
      .text(
        content,
        PAGE_DIVIDER + inchesToPDFKit(1),
        this.onHeaderPage ? inchesToPDFKit(4) : inchesToPDFKit(1),
        {
          indent: inchesToPDFKit(0.3),
          lineGap: inchesToPDFKit(0.025),
        }
      );
  };

  newPage = () => {
    this.doc.addPage();
  };

  loadChapter = async (txtDir) => {
    const chapter = await readFile("./ringworld-1.txt", "utf8");
    // chapter header will be all contents of the file until the <END_HEADER> flag
    const [header, contents] = chapter.split("<END_HEADER>");
    this.writeHeaderTitleRight("Ringworld");
    this.writePageNumberRight("1");
    this.writeChapterHeader(header);
    console.log(
      this.doc.widthOfString(contents, { fontSize: 12 }) / CONTENT_BLOCK_WIDTH
    );
    console.log(
      this.doc.heightOfString(contents, { fontSize: 12 }) / CONTENT_BLOCK_HEIGHT
    );
    this.writeChapterContents(contents);
    this.finalizePDF();
  };

  finalizePDF = () => {
    this.doc.end();
  };
}

const formatter = new BookFormatter();
formatter.loadChapter("ringworld-1.txt");
// formatter.writeHeaderTitleLeft("Larry Niven");
// formatter.writeHeaderTitleRight("Ringworld");
// formatter.writeChapterHeader(`Chapter 1\nLouis Wu`);
