const PDFDocument = require("pdfkit");
const fs = require("fs");

const A4_WIDTH = 841.89;
const A4_HEIGHT = 595.28;
const A4_RATIO = 76;
const CENTER_PAGE_LEFT = A4_WIDTH / 4;
const CENTER_PAGE_RIGHT = CENTER_PAGE_LEFT + A4_WIDTH / 2;

const inchesToPDFKit = (inches) => {
  return A4_RATIO * inches;
};

class BookFormatter {
  doc; // PDFDocument
  filename = "output.pdf"; //string
  headerMarginX = 0.5;
  headerMarginY = 0.5;

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
    process.argv.forEach(function (val, index) {
      // 'fn' flag to add custom filename
      if (prevVal === "-fn") {
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

  writePageNumberRight = (num, marginInches = 0.5) => {
    this.doc
      .fontSize(12)
      .text(
        num,
        A4_WIDTH -
          inchesToPDFKit(
            this.headerMarginX + (num.toString().length - 1) * 0.1
          ),
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

  newPage = () => {
    this.doc.addPage();
  };

  finalizePDF = () => {
    this.doc.end();
  };
}

const formatter = new BookFormatter();
formatter.writePageNumberLeft(1);
formatter.writePageNumberRight(200);
formatter.writeHeaderTitleLeft("Larry Niven");
formatter.writeHeaderTitleRight("Ringworld");
formatter.finalizePDF();
