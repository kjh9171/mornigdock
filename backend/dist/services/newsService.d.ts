/**
 * 뉴스 URL로부터 본문 내용을 정밀하게 크롤링합니다.
 */
export declare function scrapeArticleContent(url: string): Promise<string>;
/**
 * 네이버 뉴스 검색 API 및 RSS 피드로부터 최신 뉴스를 수집합니다.
 */
export declare function fetchLatestNews(): Promise<number>;
//# sourceMappingURL=newsService.d.ts.map