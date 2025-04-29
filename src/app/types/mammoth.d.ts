// src/types/mammoth.d.ts
declare module 'mammoth' {
    interface Options {
      arrayBuffer?: ArrayBuffer;
      buffer?: Buffer;
      path?: string;
    }
  
    interface Result {
      value: string;
      messages: any[];
    }
  
    export function extractRawText(options: Options): Promise<Result>;
    export function convertToHtml(options: Options): Promise<Result>;
    export function convertToMarkdown(options: Options): Promise<Result>;
  }