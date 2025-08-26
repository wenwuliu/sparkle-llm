declare module 'html-to-text' {
  export interface HtmlToTextOptions {
    wordwrap?: number | null;
    selectors?: Array<{
      selector: string;
      format?: string;
      options?: any;
    }>;
    [key: string]: any;
  }

  export function convert(html: string, options?: HtmlToTextOptions): string;
  export function htmlToText(html: string, options?: HtmlToTextOptions): string;
}
