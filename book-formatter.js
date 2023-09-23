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
const CONTENT_BLOCK_HEIGHT = A4_HEIGHT - inchesToPDFKit(1.25);
const CONTENT_BLOCK_WIDTH = PAGE_DIVIDER - inchesToPDFKit(1.25);
const TABBED_CONTENT_BLOCK_WIDTH = CONTENT_BLOCK_WIDTH - inchesToPDFKit(0.3);
const CENTER_PAGE_LEFT = inchesToPDFKit(0.5) + CONTENT_BLOCK_WIDTH / 2;
const CENTER_PAGE_RIGHT =
  PAGE_DIVIDER + inchesToPDFKit(0.75) + CONTENT_BLOCK_WIDTH / 2;

const CONTENT_TEXT_OPTIONS = {
  fontSize: 12,
  lineBreak: false,
};

class BookFormatter {
  doc; // PDFDocument
  filename = "output.pdf"; // string
  headerMarginX = 0.5; // float, in inches
  headerMarginY = 0.5; // float, in inches
  onHeaderPage = false; // boolean
  pages = []; // array of curPage
  curPage = []; // array of
  /* 
    {
      text: string,
      marginX: float,
      marginY: float,
      fontSize: int
    }*/
  leftOrRight; // boolean, true === left, false === right
  headerLeft; // string
  headerRight; // string

  constructor() {
    // Create a document
    // A4 (841.89 x 595.28)
    this.doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      font: "fonts/FrankRuhlLibre-Regular.ttf",
    });

    // procss terminal parameters
    let prevVal = "";
    for (const val of process.argv) {
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

      if (prevVal === "-hl") {
        // hl = Header Left
        this.headerLeft = val;
      }

      if (prevVal === "-hr") {
        // hr = Header Right
        this.headerRight = val;
      }

      prevVal = val;
    }

    this.doc.pipe(fs.createWriteStream(this.filename));
  }

  writePageNumberLeft = (num) => {
    num = num.toString();
    this.doc
      .fontSize(12)
      .text(
        num,
        inchesToPDFKit(this.headerMarginX),
        inchesToPDFKit(this.headerMarginY)
      );
  };

  writePageNumberRight = (num) => {
    num = num.toString();
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

  writeHeaderTitleLeft = () => {
    if (this.headerLeft == null) return;
    const headerWidth = this.doc.widthOfString(this.headerLeft);
    this.doc
      .fontSize(12)
      .text(
        this.headerLeft,
        CENTER_PAGE_LEFT - headerWidth / 2,
        inchesToPDFKit(this.headerMarginY)
      );
  };

  writeHeaderTitleRight = () => {
    if (this.headerRight == null) return;
    const headerWidth = this.doc.widthOfString(this.headerRight);
    this.doc
      .fontSize(12)
      .text(
        this.headerRight,
        CENTER_PAGE_RIGHT - headerWidth / 2,
        inchesToPDFKit(this.headerMarginY)
      );
  };

  writeChapterHeader = (header) => {
    // chapters will always begin on the right page.
    this.curPage.push({
      text: header,
      marginX: PAGE_DIVIDER + inchesToPDFKit(1),
      marginY: inchesToPDFKit(1),
      fontSize: 32,
    });
    this.onHeaderPage = true;
    this.leftOrRight = false;
  };

  charIsWhiteSpace = (ch) => {
    return ch === " " || ch === "";
  };

  writeChapterContents = (contents) => {
    // each newline should represent a single paragraph.
    // filter out empty lines.
    const paragraphs = contents.split(`\n`).filter((p) => !!p);

    let curMarginY = inchesToPDFKit(this.onHeaderPage ? 3.5 : 1);
    if (this.onHeaderPage) {
      this.onHeaderPage = false;
      this.doc.fontSize(12);
    }
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
        let lineContent = p.slice(i, i + lineLength).trim();
        while (
          !this.charIsWhiteSpace(p.charAt(i + lineLength)) ||
          this.doc.widthOfString(lineContent) >
            (tab ? TABBED_CONTENT_BLOCK_WIDTH : CONTENT_BLOCK_WIDTH)
        ) {
          lineLength -= 1;
          lineContent = p.slice(i, i + lineLength).trim();
        }

        this.curPage.push({
          text: lineContent,
          marginX: this.leftOrRight
            ? inchesToPDFKit(0.5 + (tab ? 0.3 : 0))
            : PAGE_DIVIDER + inchesToPDFKit(0.75 + (tab ? 0.3 : 0)),
          marginY: curMarginY,
          fontSize: 12,
        });

        // if we just wrote the first line, change to untabbed.
        if (tab) {
          tab = false;
        }

        // alter the y margin for the next line
        curMarginY += marginStep;

        // if curMarginY exceeds the bottom margin of the page, move to the next page
        if (
          curMarginY + marginStep >
          CONTENT_BLOCK_HEIGHT + inchesToPDFKit(1)
        ) {
          this.pages.push(this.curPage);
          this.curPage = [];
          curMarginY = inchesToPDFKit(1);
          this.leftOrRight = !this.leftOrRight;
        }
      }
    }
    // push any incomplete page
    this.pages.push(this.curPage);
    this.curPage = [];
  };

  newPage = () => {
    this.doc.addPage();
  };

  loadChapter = async (txtDir) => {
    const chapter = await readFile(txtDir, "utf8");
    // chapter header will be all contents of the file until the <END_HEADER> flag
    const [header, contents] = chapter.split("<END_HEADER>");
    // ensure the starting page of the chapter is odd
    if ((this.pages.length + 1) % 2 !== 1) {
      this.pages.push([]);
    }
    this.writeChapterHeader(header);
    this.writeChapterContents(contents);
  };

  loadChapters = async (txtDirs) => {
    for (const txtDir of txtDirs) {
      await this.loadChapter(txtDir);
    }
  };

  printDoc = () => {
    /* [

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

    for (let i = 0; i < this.pages.length; i += 4) {
      const renderPage = (page, pageNum, leftPage) => {
        if (page == null || page.length === 0) {
          return;
        }
        console.log(
          "rendering " +
            (leftPage ? "left" : "right") +
            " page " +
            pageNum.toString()
        );
        let chapterPage = false; // only print page header and number on non-chapter pages
        for (const line of page) {
          if (line.fontSize > 12) {
            chapterPage = true;
          }
          this.doc
            .fontSize(line.fontSize)
            .text(
              line.text,
              line.marginX,
              line.marginY,
              line.fontSize > 12 ? null : CONTENT_TEXT_OPTIONS
            );
        }
        if (!chapterPage) {
          if (leftPage) {
            this.writePageNumberLeft(pageNum);
            this.writeHeaderTitleLeft();
          } else {
            this.writePageNumberRight(pageNum);
            this.writeHeaderTitleRight();
          }
        }
      };
      renderPage(this.pages[i + 3], i + 4, true); // p4
      renderPage(this.pages[i], i + 1, false); // p1
      this.newPage();
      renderPage(this.pages[i + 1], i + 2, true); // p2
      renderPage(this.pages[i + 2], i + 3, false); // p3
      this.newPage();
    }

    this.finalizePDF();
  };

  finalizePDF = () => {
    this.doc.end();
  };

  drawCenterLine = () => {
    this.doc.moveTo(PAGE_DIVIDER, 0).lineTo(PAGE_DIVIDER, A4_HEIGHT).stroke();
  };

  drawContentBoxes = () => {
    // left side
    let topLeftX = A4_RATIO / 2;
    const topLeftY = A4_RATIO;
    this.doc
      .moveTo(topLeftX, topLeftY)
      .polygon(
        [topLeftX + CONTENT_BLOCK_WIDTH, topLeftY],
        [topLeftX + CONTENT_BLOCK_WIDTH, topLeftY + CONTENT_BLOCK_HEIGHT],
        [topLeftX, topLeftY + CONTENT_BLOCK_HEIGHT],
        [topLeftX, topLeftY]
      )
      .stroke();

    // right side
    topLeftX += PAGE_DIVIDER + inchesToPDFKit(0.25);
    this.doc
      .moveTo(topLeftX, topLeftY)
      .polygon(
        [topLeftX + CONTENT_BLOCK_WIDTH, topLeftY],
        [topLeftX + CONTENT_BLOCK_WIDTH, topLeftY + CONTENT_BLOCK_HEIGHT],
        [topLeftX, topLeftY + CONTENT_BLOCK_HEIGHT],
        [topLeftX, topLeftY]
      )
      .stroke();
  };
}

let prevVal = null;
let title = null;
for (const val of process.argv) {
  if (prevVal === "-t") {
    title = val;
  }
  prevVal = val;
}

if (title == null) {
  console.log("no title provided");
  process.exit();
}

const formatter = new BookFormatter();
let files = [];
for (let i = 1; i <= 24; i++) {
  files.push(title + "-" + i.toString() + ".txt");
}
formatter.loadChapters(files).then(() => {
  formatter.printDoc();
});

// expected file format: "{title}-{index}.txt (1 indexed)

// you can use this terminal command to create the files
// for i in {1..100}; do touch title-${i}.txt; done
