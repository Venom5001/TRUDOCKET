export interface CaseLawSource {
  id: string;       // "S1", "S2", …
  title: string;
  court: string;
  date: string;
  url: string;
  snippet: string;
}

interface CLSearchResult {
  caseName?: string;
  case_name?: string;
  court?: string;
  court_id?: string;
  dateFiled?: string;
  date_filed?: string;
  absolute_url?: string;
  absoluteUrl?: string;
  snippet?: string;
}

interface CLSearchResponse {
  results?: CLSearchResult[];
}

export async function searchOpinions(opts: {
  query: string;
  jurisdiction?: string;
  limit?: number;
}): Promise<{ sources: CaseLawSource[]; tokenMissing: boolean }> {
  const token = process.env.COURTLISTENER_API_TOKEN;
  if (!token) {
    return { sources: [], tokenMissing: true };
  }

  const params = new URLSearchParams({
    q: opts.query,
    type: "o",
    order_by: "score desc",
    stat_Precedential: "on",
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(
      `https://www.courtlistener.com/api/rest/v4/search/?${params}`,
      {
        headers: { authorization: `Token ${token}` },
        signal: controller.signal,
      }
    );
    clearTimeout(timer);

    if (!response.ok) return { sources: [], tokenMissing: false };

    const data = (await response.json()) as CLSearchResponse;
    const limit = opts.limit ?? 5;

    const sources: CaseLawSource[] = (data.results ?? [])
      .slice(0, limit)
      .map((r, i) => {
        const name = r.caseName ?? r.case_name ?? "Unknown Case";
        const court = r.court ?? r.court_id ?? "Unknown Court";
        const date = r.dateFiled ?? r.date_filed ?? "";
        const path = r.absolute_url ?? r.absoluteUrl ?? "";
        const url = path.startsWith("http")
          ? path
          : `https://www.courtlistener.com${path}`;
        return {
          id: `S${i + 1}`,
          title: name,
          court,
          date,
          url,
          snippet: r.snippet ?? "",
        };
      });

    return { sources, tokenMissing: false };
  } catch {
    clearTimeout(timer);
    return { sources: [], tokenMissing: false };
  }
}
