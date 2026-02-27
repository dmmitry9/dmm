// Thin GraphQL client using native fetch — zero dependencies

const SUBGRAPH_URL = import.meta.env.VITE_SUBGRAPH_URL || "";

interface GraphQLResponse<T> {
  data: T;
  errors?: { message: string }[];
}

export async function querySubgraph<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T | null> {
  if (!SUBGRAPH_URL) return null;
  try {
    const res = await fetch(SUBGRAPH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });
    const json: GraphQLResponse<T> = await res.json();
    if (json.errors) {
      console.error("Subgraph error:", json.errors);
      return null;
    }
    return json.data;
  } catch (err) {
    console.error("Subgraph fetch failed:", err);
    return null;
  }
}

export function isSubgraphConfigured(): boolean {
  return !!SUBGRAPH_URL;
}
