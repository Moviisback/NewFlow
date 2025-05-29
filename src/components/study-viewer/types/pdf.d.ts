// src/types/pdf.d.ts
declare module 'pdfjs-dist/types/src/display/api' {
    export interface TextItem {
      str: string;
      dir: string;
      transform: number[];
      width: number;
      height: number;
      fontName: string;
    }
  }