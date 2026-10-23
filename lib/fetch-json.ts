export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, init);
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    await response.text();
    throw new Error(`The server returned a non-JSON response (${response.status}). Restart the app and try again.`);
  }
  const data = await response.json() as T;
  return { response, data };
}
