const PDFDocument = require("pdfkit");
const fs = require("fs");
const { readFile } = require("fs/promises");

const A4_WIDTH = 841.89;
const A4_HEIGHT = 595.28;
const A4_RATIO = 76;
const inchesToPDFKit = (inches) => {
  return A4_RATIO * inches;
};

const PAGE_DIVIDER = A4_WIDTH / 2;
const CENTER_PAGE_LEFT = A4_WIDTH / 4;
const CENTER_PAGE_RIGHT = CENTER_PAGE_LEFT + PAGE_DIVIDER;
const CONTENT_BLOCK_HEIGHT = A4_HEIGHT - A4_RATIO * 1.5;
const CONTENT_BLOCK_WIDTH = PAGE_DIVIDER - A4_RATIO * 0.5;
const TABBED_CONTENT_BLOCK_WIDTH = CONTENT_BLOCK_WIDTH - inchesToPDFKit(0.3);

const CONTENT_TEXT_OPTIONS = {
  fontSize: 12,
  // indent: inchesToPDFKit(0.3),
  // lineGap: inchesToPDFKit(0.025),
  lineBreak: false,
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

  charIsWhiteSpace = (ch) => {
    return /\s/.test(ch);
  };

  writeChapterContents = (contents) => {
    // each newline should represent a single paragraph.
    // filter out empty lines.
    const paragraphs = contents.split(`\n`).filter((p) => !!p);
    // const rejoined = paragraphs.join(`\n`);
    let curMargin = inchesToPDFKit(1);
    const marginStep = Math.floor(
      this.doc.heightOfString("height", CONTENT_TEXT_OPTIONS) +
        inchesToPDFKit(0.025)
    );
    for (const p of paragraphs) {
      // the width of the paragraph in PDFKit units
      const p_length = this.doc.widthOfString(p, CONTENT_TEXT_OPTIONS);

      // Number of non-tabbed lines this should take up
      const numLines =
        p_length <= TABBED_CONTENT_BLOCK_WIDTH
          ? 0
          : Math.ceil(
              (p_length - TABBED_CONTENT_BLOCK_WIDTH) / CONTENT_BLOCK_WIDTH
            );

      // char length approximate tabbed line size (will be adjusted)
      const tabbedLineSize = Math.floor(
        p.length / (p_length / TABBED_CONTENT_BLOCK_WIDTH)
      );

      // char length approximate non-tabbed line size (will be adjusted)
      const lineSize = Math.floor(p.length / numLines);

      // char length of the next line to be printed. start with a tabbed line length
      let lineLength = tabbedLineSize;

      // tells us its the first line
      let tab = true;
      for (let i = 0; i < p.length; i += lineLength) {
        // check if this is the first line. If not, reset lineLength to nontabbed lineSize
        if (!tab) {
          lineLength = lineSize;
        }

        // ensure we only linebreak at a whitespace char. make the lines shorter rather than longer.
        while (
          !!p.charAt(i + lineLength) &&
          !this.charIsWhiteSpace(p.charAt(i + lineLength))
        ) {
          lineLength -= 1;
        }
        const lineContent = p.slice(i, i + lineLength).trim();

        this.writePageContentRight(lineContent, curMargin, tab);

        // if we just wrote the first line, change to untabbed.
        if (tab) {
          tab = false;
        }

        // alter the y margin for the next line
        curMargin += marginStep;

        // if curMargin exceeds the bottom margin of the page, move to the next page
        if (curMargin > CONTENT_BLOCK_HEIGHT + inchesToPDFKit(1)) {
          this.newPage();
          curMargin = inchesToPDFKit(1);
        }
      }
    }
  };

  writePageContentLeft = (content) => {};

  writePageContentRight = (content, yMargin, tabbed = false) => {
    const xMargin = PAGE_DIVIDER + inchesToPDFKit(1 + (tabbed ? 0.3 : 0));

    this.doc.text(content.trim(), xMargin, yMargin, CONTENT_TEXT_OPTIONS);
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
    // this.writeChapterHeader(header);
    this.writeChapterContents(contents);
    this.finalizePDF();
  };

  printDoc = () => {
    // TODO: when writing chapter contents, don't write to the doc yet. Instead, create object array that looks like this:
    /* [
      [{
        text,
        marginTop,
        marginLeft,
        tab
      }]
    ]

    where the index (+1) is the page number.
    We'll only actually write this to the page in this printDoc method (when all chapters are loaded)
    pages are numbered like 

    ---------------------
    |         |         |
    |         |         |
    |    4    |    1    |
    |         |         |
    |         |         |
    |--------------------
    ---------------------
    |         |         |
    |         |         |
    |    2    |    3    |
    |         |         |
    |         |         |
    |--------------------
    */
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
