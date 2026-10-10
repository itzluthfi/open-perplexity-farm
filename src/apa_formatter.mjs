/**
 * Utilitas pemformat sitasi akademik APA 6th Edition & BibTeX
 * Khusus dirancang untuk standarisasi proposal/skripsi ITATS & publikasi ilmiah.
 */

export function extractCitationsFromMarkdown(markdownText) {
  const citations = [];
  // 1. Ekstrak pola URL Markdown: [Title](url)
  const mdLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g;
  let match;
  while ((match = mdLinkRegex.exec(markdownText)) !== null) {
    const title = match[1].trim();
    const url = match[2].trim();
    if (!url.includes("perplexity.ai")) {
      citations.push({
        title,
        url,
        domain: parseDomain(url)
      });
    }
  }

  // 2. Ekstrak URL mentah jika ada di bagian bawah
  const urlRegex = /(https?:\/\/[^\s\)]+)/g;
  const lines = markdownText.split("\n");
  for (const line of lines) {
    if (line.toLowerCase().includes("sumber") || line.toLowerCase().includes("referensi") || line.toLowerCase().includes("source")) {
      let urlMatch;
      while ((urlMatch = urlRegex.exec(line)) !== null) {
        const url = urlMatch[1];
        if (!citations.some(c => c.url === url) && !url.includes("perplexity.ai")) {
          citations.push({
            title: parseDomain(url),
            url,
            domain: parseDomain(url)
          });
        }
      }
    }
  }

  return deduplicateCitations(citations);
}

function parseDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "web";
  }
}

function deduplicateCitations(citations) {
  const seen = new Set();
  const result = [];
  for (const c of citations) {
    if (!seen.has(c.url)) {
      seen.add(c.url);
      result.push(c);
    }
  }
  return result;
}

/**
 * Format satu sitasi ke APA 6th Edition
 */
export function formatToApa6(citation, fallbackYear = 2024) {
  const domain = parseDomain(citation.url);
  const title = citation.title || "Referensi Ilmiah";
  const year = citation.year || fallbackYear;
  const author = citation.author || capitalizeFirst(domain.split(".")[0]);

  // Format APA 6th: Author, A. A. (Tahun). Judul artikel. Nama Jurnal/Website. Diambil dari URL
  return `${author}. (${year}). ${title}. Diambil dari ${citation.url}`;
}

/**
 * Format seluruh array sitasi ke blok Daftar Pustaka APA 6th rapi
 */
export function generateApa6ReferenceList(citations, fallbackYear = 2024) {
  if (!citations || citations.length === 0) return "";
  
  const entries = citations.map(c => formatToApa6(c, fallbackYear));
  entries.sort(); // Urut alfabetis sesuai APA 6
  
  return entries.join("\n\n");
}

/**
 * Format sitasi ke BibTeX
 */
export function formatToBibtex(citation, index = 1, fallbackYear = 2024) {
  const domain = parseDomain(citation.url);
  const tag = `${domain.replace(/[^a-zA-Z0-9]/g, "")}_${fallbackYear}_${index}`;
  const title = (citation.title || "Document Title").replace(/[{}]/g, "");
  
  return `@misc{${tag},
  title = {${title}},
  author = {${citation.author || domain}},
  year = {${citation.year || fallbackYear}},
  url = {${citation.url}},
  note = {Diakses melalui Open Perplexity Studio}
}`;
}

function capitalizeFirst(string) {
  if (!string) return "";
  return string.charAt(0).toUpperCase() + string.slice(1);
}
