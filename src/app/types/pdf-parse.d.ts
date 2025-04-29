// src/types/pdf-parse.d.ts
declare module 'pdf-parse' {
  interface PDFInfo {
    numpages: number;
    numrender: number;
    info: Record<string, any>;
    metadata: Record<string, any> | null;
    text: string;
    version: string;
  }
  
  interface Options {
    pagerender?: (pageData: any) => string;
    max?: number;
    version?: string;
  }
  
  function pdf(dataBuffer: Buffer, options?: Options): Promise<PDFInfo>;
  
  export default pdf;
}