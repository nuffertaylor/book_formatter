#!/usr/bin/env node

const PDFDocument = require("pdfkit");
const fs = require("fs");
const { readFile } = require("fs/promises");

const A4_WIDTH = 841.89;
const A4_HEIGHT = 595.28;
const A4_RATIO = 76; // Ratio of PDFKit Units to Inches

const LETTER_WIDTH = 792;
const LETTER_HEIGHT = 612;
const inchesToPDFKit = (inches) => {
  return A4_RATIO * inches;
};
const PAGE_DIVIDER = LETTER_WIDTH / 2;

const CONTENT_TEXT_OPTIONS = {
  fontSize: 12,
  lineBreak: false,
};

class BookFormatter {
  // args that can be set by the terminal
  filename = "output.pdf"; // string
  headerLeft; // string, printed on all left pages
  headerRight; // string, printed on all right pages
  headerMarginX = 0.5; // float, in inches
  headerMarginY = 0.5; // float, in inches (identical on both sides)
  contentMarginTop = 1; // float, in inches Must be > headerMarginX
  contentMarginBottom = 0.5; // float, in inches
  outsideMarginX = 0.5; // float, in inches - margin on the outside of the page
  insideMarginX = 0.75; // float, in inches - margin on the interior of the page
  tabSize = 0.3; // float, how much to indent paragraphs
  contentMarginOnNewChapter = 3.5; // where to start content on new page
  separationBetweenLines = 0.025; // how much margin to put between lines
  headerFontSize = 12; // font size of page numbers and center header text
  chapterHeaderFontSize = 32; // font size of chapter indicators
  contentFontSize = 12; // font size of content
  showContentMargins = false; // if set to true, will draw outline of content block margins
  font = "FrankRuhlLibre-Regular.ttf";

  // functional attributes
  CONTENT_BLOCK_HEIGHT;
  CONTENT_BLOCK_WIDTH;
  TABBED_CONTENT_BLOCK_WIDTH;
  CENTER_PAGE_LEFT;
  CENTER_PAGE_RIGHT;
  onHeaderPage = false; // boolean
  doc; // PDFDocument
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

  constructor() {
    this.initArgs();
    // Create a document
    // A4 (841.89 x 595.28)
    // LETTER (792 x 612)
    this.doc = new PDFDocument({
      size: "LETTER",
      layout: "landscape",
      font: "fonts/" + this.font + ".ttf",
    });

    this.doc.pipe(fs.createWriteStream(this.filename));
  }

  // initalize attrs passed via cmd line
  initArgs = () => {
    let prevVal = "";
    for (const val of process.argv) {
      // 'fn' flag to add custom filename
      switch (prevVal) {
        case "-f":
          this.font = val;
          break;
        case "-fn": // fn = FileName
          this.filename = val;
          if (
            this.filename.slice(
              this.filename.length - 4,
              this.filename.length
            ) !== ".pdf"
          ) {
            this.filename += ".pdf";
          }
          break;
        case "-hl": // hl = Header Left
          this.headerLeft = val;
          break;
        case "-hr": // hr = Header Right
          this.headerRight = val;
          break;
        case "-hmx":
          this.headerMarginX = Number(val);
          break;
        case "-hmy":
          this.headerMarginY = Number(val);
          break;
        case "-cmt":
          this.contentMarginTop = Number(val);
          break;
        case "-cmb":
          this.contentMarginBottom = Number(val);
          break;
        case "-omx":
          this.outsideMarginX = Number(val);
          break;
        case "-imx":
          this.insideMarginX = Number(val);
          break;
        case "-ts":
          this.tabSize = Number(val);
          break;
        case "-cmonnc":
          this.contentMarginOnNewChapter = Number(val);
          break;
        case "-sbl":
          this.separationBetweenLines = Number(val);
          break;
        case "-hfs":
          this.headerFontSize = Number(val);
          break;
        case "-chfs":
          this.chapterHeaderFontSize = Number(val);
          break;
        case "-fs":
          this.contentFontSize = Number(val);
          break;
        case "-scm":
          this.showContentMargins = !!val; // boolean should be passed as 0 | 1
          break;
      }

      prevVal = val;

      this.CONTENT_BLOCK_HEIGHT =
        LETTER_HEIGHT -
        inchesToPDFKit(this.contentMarginBottom + this.contentMarginTop);
      this.CONTENT_BLOCK_WIDTH =
        PAGE_DIVIDER - inchesToPDFKit(this.outsideMarginX + this.insideMarginX);
      this.TABBED_CONTENT_BLOCK_WIDTH =
        this.CONTENT_BLOCK_WIDTH - inchesToPDFKit(this.tabSize);
      this.CENTER_PAGE_LEFT =
        inchesToPDFKit(this.outsideMarginX) + this.CONTENT_BLOCK_WIDTH / 2;
      this.CENTER_PAGE_RIGHT =
        PAGE_DIVIDER +
        inchesToPDFKit(this.insideMarginX) +
        this.CONTENT_BLOCK_WIDTH / 2;
    }
  };

  writePageNumberLeft = (num) => {
    num = num.toString();
    this.doc
      .fontSize(this.headerFontSize)
      .text(
        num,
        inchesToPDFKit(this.headerMarginX),
        inchesToPDFKit(this.headerMarginY)
      );
  };

  writePageNumberRight = (num) => {
    num = num.toString();
    this.doc
      .fontSize(this.headerFontSize)
      .text(
        num,
        LETTER_WIDTH -
          inchesToPDFKit(this.headerMarginX) -
          this.doc.widthOfString(num),
        inchesToPDFKit(this.headerMarginY)
      );
  };

  writeHeaderTitleLeft = () => {
    if (this.headerLeft == null) return;
    const headerWidth = this.doc.widthOfString(this.headerLeft);
    this.doc
      .fontSize(this.headerFontSize)
      .text(
        this.headerLeft,
        this.CENTER_PAGE_LEFT - headerWidth / 2,
        inchesToPDFKit(this.headerMarginY)
      );
  };

  writeHeaderTitleRight = () => {
    if (this.headerRight == null) return;
    const headerWidth = this.doc.widthOfString(this.headerRight);
    this.doc
      .fontSize(this.headerFontSize)
      .text(
        this.headerRight,
        this.CENTER_PAGE_RIGHT - headerWidth / 2,
        inchesToPDFKit(this.headerMarginY)
      );
  };

  writeChapterHeader = (header) => {
    // chapters will always begin on the right page.
    this.curPage.push({
      text: header,
      marginX: PAGE_DIVIDER + inchesToPDFKit(this.insideMarginX),
      marginY: inchesToPDFKit(this.contentMarginTop),
      fontSize: this.chapterHeaderFontSize,
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

    let curMarginY = inchesToPDFKit(
      this.onHeaderPage ? this.contentMarginOnNewChapter : this.contentMarginTop
    );
    if (this.onHeaderPage) {
      this.onHeaderPage = false;
      this.doc.fontSize(this.contentFontSize);
    }
    const marginStep = Math.floor(
      this.doc.heightOfString("height", CONTENT_TEXT_OPTIONS) +
        inchesToPDFKit(this.separationBetweenLines)
    );
    for (let p of paragraphs) {
      let tabLineWidth = this.TABBED_CONTENT_BLOCK_WIDTH;
      let mainLineWidth = this.CONTENT_BLOCK_WIDTH;
      let addtlMarginX = 0;

      // tells us its the first line
      let tab = true;

      if (p.includes("<MID_BREAK>")) {
        curMarginY += marginStep * 3;
        continue;
      }

      if (p.includes("<BLOCK_LINE>")) {
        p = p.replace("<BLOCK_LINE>", "");
        addtlMarginX += inchesToPDFKit(this.tabSize);
        tabLineWidth -= inchesToPDFKit(this.tabSize);
        mainLineWidth -= inchesToPDFKit(this.tabSize * 2);
        tab = false; // this prevents new paragraphs from having tabs. should block_line have this attr?
      }

      // the width of the paragraph in PDFKit units
      const p_length = this.doc.widthOfString(p, CONTENT_TEXT_OPTIONS);

      // Number of non-tabbed lines this should take up
      const numLines =
        p_length <= tabLineWidth
          ? 0
          : Math.ceil((p_length - tabLineWidth) / mainLineWidth);

      // char length approximate tabbed line size (will be adjusted)
      const tabbedLineSize = Math.floor(p.length / (p_length / tabLineWidth));

      // char length approximate non-tabbed line size (will be adjusted)
      const lineSize = Math.floor(p.length / numLines);

      // char length of the next line to be printed. start with a tabbed line length
      let lineLength = tabbedLineSize;

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
            (tab ? tabLineWidth : mainLineWidth)
        ) {
          lineLength -= 1;
          lineContent = p.slice(i, i + lineLength).trim();
        }

        this.curPage.push({
          text: lineContent,
          marginX: this.leftOrRight
            ? inchesToPDFKit(this.outsideMarginX + (tab ? this.tabSize : 0)) +
              addtlMarginX
            : PAGE_DIVIDER +
              addtlMarginX +
              inchesToPDFKit(this.insideMarginX + (tab ? this.tabSize : 0)),
          marginY: curMarginY,
          fontSize: this.contentFontSize,
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
          this.CONTENT_BLOCK_HEIGHT + inchesToPDFKit(this.contentMarginTop)
        ) {
          this.pages.push(this.curPage);
          this.curPage = [];
          curMarginY = inchesToPDFKit(this.contentMarginTop);
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
          if (line.fontSize > this.contentFontSize) {
            chapterPage = true;
          }
          this.doc
            .fontSize(line.fontSize)
            .text(
              line.text,
              line.marginX,
              line.marginY,
              line.fontSize > this.contentFontSize ? null : CONTENT_TEXT_OPTIONS
            );
        }
        if (!chapterPage) {
          if (leftPage) {
            this.writePageNumberLeft(pageNum);
            this.writeHeaderTitleLeft();
            if (this.showContentMargins) {
              this.drawContentBoxes();
            }
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
    this.doc
      .moveTo(PAGE_DIVIDER, 0)
      .lineTo(PAGE_DIVIDER, LETTER_HEIGHT)
      .stroke();
  };

  drawContentBoxes = () => {
    // left side
    let topLeftX = A4_RATIO / 2;
    const topLeftY = A4_RATIO;
    this.doc
      .moveTo(topLeftX, topLeftY)
      .polygon(
        [topLeftX + this.CONTENT_BLOCK_WIDTH, topLeftY],
        [
          topLeftX + this.CONTENT_BLOCK_WIDTH,
          topLeftY + this.CONTENT_BLOCK_HEIGHT,
        ],
        [topLeftX, topLeftY + this.CONTENT_BLOCK_HEIGHT],
        [topLeftX, topLeftY]
      )
      .stroke();

    // right side
    topLeftX += PAGE_DIVIDER + inchesToPDFKit(0.25);
    this.doc
      .moveTo(topLeftX, topLeftY)
      .polygon(
        [topLeftX + this.CONTENT_BLOCK_WIDTH, topLeftY],
        [
          topLeftX + this.CONTENT_BLOCK_WIDTH,
          topLeftY + this.CONTENT_BLOCK_HEIGHT,
        ],
        [topLeftX, topLeftY + this.CONTENT_BLOCK_HEIGHT],
        [topLeftX, topLeftY]
      )
      .stroke();
  };
}

let prevVal = null; // any
let title = null; // string
let numChapters = null; // integer
for (const val of process.argv) {
  if (prevVal === "-t") {
    title = val;
  }
  if (prevVal === "-nc") {
    numChapters = Number(val);
  }
  prevVal = val;
}

if (title == null) {
  console.log("no title provided");
  process.exit();
}

if (numChapters == null) {
  console.log("number of chapters not provided");
  process.exit();
}

const formatter = new BookFormatter();
let files = [];
for (let i = 1; i <= numChapters; i++) {
  files.push(title + "-" + i.toString() + ".txt");
}
formatter.loadChapters(files).then(() => {
  formatter.printDoc();
});

// expected file format: "{title}-{index}.txt (1 indexed)

// you can use this terminal command to create the files
// for i in {1..100}; do touch title-${i}.txt; done
