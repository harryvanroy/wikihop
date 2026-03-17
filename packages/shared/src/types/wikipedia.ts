export interface WikiArticle {
  title: string;
  pageid: number;
  html: string;
  links: string[];
}

export interface WikiLink {
  title: string;
  ns: number;
}
