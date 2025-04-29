// src/types/pdf-parse.d.ts
declare module 'pdf-parse' {
  interface PDFInfo {
    PDFFormatVersion: string;
    IsAcroFormPresent: boolean;
    IsXFAPresent: boolean;
    [key: string]: any;
  }

  interface PDFMetadata {
    _metadata?: {
      [key: string]: any;
    };
    [key: string]: any;
  }

  interface PDFParseResult {
    numpages: number;
    numrender: number;
    info: PDFInfo;
    metadata: PDFMetadata;
    text: string;
    version: string;
  }

  function pdf(dataBuffer: Buffer, options?: any): Promise<PDFParseResult>;

  export default pdf;
}

// src/types/pdfjs-dist.d.ts
declare module 'pdfjs-dist' {
  export interface PDFDocumentProxy {
    numPages: number;
    getPage(pageNumber: number): Promise<PDFPageProxy>;
  }

  export interface PDFPageProxy {
    getTextContent(): Promise<TextContent>;
  }

  export interface TextContent {
    items: TextItem[];
  }

  export interface TextItem {
    str: string;
    dir: string;
    transform: number[];
    width: number;
    height: number;
  }

  export interface PDFWorker {
    destroy(): void;
  }

  export const GlobalWorkerOptions: {
    workerSrc: string | boolean;
  };

  export const version: string;

  export function getDocument(options: {
    data: ArrayBuffer | Uint8Array;
    useWorkerFetch?: boolean;
    isEvalSupported?: boolean;
    useSystemFonts?: boolean;
    disableWorker?: boolean;
    disableFontFace?: boolean;
  }): { promise: Promise<PDFDocumentProxy> };
}

declare module 'pdfjs-dist/legacy/build/pdf' {
  export * from 'pdfjs-dist';
}