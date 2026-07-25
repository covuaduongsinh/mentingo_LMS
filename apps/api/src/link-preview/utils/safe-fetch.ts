import * as dns from "node:dns";
import * as http from "node:http";
import * as https from "node:https";
import { isIP } from "node:net";

import { isBlockedIpAddress } from "./ssrf-guard";

const TIMEOUT_MS = 5_000;
const MAX_BODY_BYTES = 512 * 1024;
const MAX_REDIRECTS = 3;
const USER_AGENT = "MentingoLinkPreview/1.0 (+https://covuahocduong.com)";

export class LinkPreviewFetchError extends Error {}

type LookupCallback = (
  err: NodeJS.ErrnoException | null,
  address: string | dns.LookupAddress[],
  family?: number,
) => void;

// A drop-in replacement for `dns.lookup` that rejects any resolved address
// falling in a blocked range (loopback/private/link-local/unspecified).
// Passed as the `lookup` option to http(s).request so validation happens at
// the moment the TCP connection is actually opened — closing the DNS
// rebinding gap where a hostname could resolve differently between an
// earlier check and the real connection.
const safeLookup = (
  hostname: string,
  optionsOrCallback: dns.LookupOneOptions | dns.LookupAllOptions | LookupCallback,
  maybeCallback?: LookupCallback,
): void => {
  const options: { all?: boolean } =
    typeof optionsOrCallback === "object" && optionsOrCallback !== null ? optionsOrCallback : {};
  const callback = (typeof optionsOrCallback === "function" ? optionsOrCallback : maybeCallback) as
    | LookupCallback
    | undefined;

  if (!callback) return;

  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, "", 0);

    const list = addresses as dns.LookupAddress[];
    if (!list.length) return callback(new Error("DNS resolution returned no addresses"), "", 0);
    if (list.some((entry) => isBlockedIpAddress(entry.address))) {
      return callback(new Error("Resolved address is not allowed"), "", 0);
    }

    if (options.all) {
      callback(null, list);
      return;
    }

    const [first] = list;
    callback(null, first.address, first.family);
  });
};

type FetchOnceResult = { statusCode: number; location?: string; body: string };

const fetchOnce = (targetUrl: URL): Promise<FetchOnceResult> =>
  new Promise((resolve, reject) => {
    // A literal IP in the URL (e.g. http://127.0.0.1/) never goes through
    // `lookup` at all, so it must be checked explicitly up front.
    if (isIP(targetUrl.hostname) && isBlockedIpAddress(targetUrl.hostname)) {
      reject(new LinkPreviewFetchError("Address not allowed"));
      return;
    }

    const transport = targetUrl.protocol === "https:" ? https : http;

    const req = transport.request(
      targetUrl,
      {
        method: "GET",
        timeout: TIMEOUT_MS,
        lookup: safeLookup as unknown as typeof dns.lookup,
        headers: { "User-Agent": USER_AGENT },
      },
      (res) => {
        // Defense in depth: re-check the address the socket actually
        // connected to, in case anything upstream bypassed `lookup`.
        const remoteAddress = res.socket?.remoteAddress?.replace(/^::ffff:/, "");
        if (remoteAddress && isBlockedIpAddress(remoteAddress)) {
          req.destroy();
          reject(new LinkPreviewFetchError("Address not allowed"));
          return;
        }

        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          res.resume();
          resolve({ statusCode: res.statusCode, location: res.headers.location, body: "" });
          return;
        }

        let received = 0;
        const chunks: Buffer[] = [];

        res.on("data", (chunk: Buffer) => {
          if (received >= MAX_BODY_BYTES) return;

          received += chunk.length;
          chunks.push(chunk);

          if (received >= MAX_BODY_BYTES) {
            req.destroy();
            resolve({
              statusCode: res.statusCode ?? 200,
              body: Buffer.concat(chunks).toString("utf-8"),
            });
          }
        });

        res.on("end", () => {
          resolve({
            statusCode: res.statusCode ?? 200,
            body: Buffer.concat(chunks).toString("utf-8"),
          });
        });
      },
    );

    req.on("timeout", () => req.destroy(new LinkPreviewFetchError("Request timed out")));
    req.on("error", (err) =>
      reject(err instanceof Error ? err : new LinkPreviewFetchError(String(err))),
    );
    req.end();
  });

/**
 * Fetches at most 512KB of HTML from an http(s) URL, following at most 3
 * redirects, with every hop (including redirects) validated against the SSRF
 * blocklist. Throws LinkPreviewFetchError on any disallowed target, timeout,
 * or network error.
 */
export const fetchHtmlSafely = async (initialUrl: string): Promise<string> => {
  let currentUrl: URL;

  try {
    currentUrl = new URL(initialUrl);
  } catch {
    throw new LinkPreviewFetchError("Invalid URL");
  }

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
    if (currentUrl.protocol !== "http:" && currentUrl.protocol !== "https:") {
      throw new LinkPreviewFetchError("Unsupported protocol");
    }

    const result = await fetchOnce(currentUrl);

    if (result.location) {
      if (redirectCount === MAX_REDIRECTS) {
        throw new LinkPreviewFetchError("Too many redirects");
      }
      currentUrl = new URL(result.location, currentUrl);
      continue;
    }

    return result.body;
  }

  throw new LinkPreviewFetchError("Too many redirects");
};
