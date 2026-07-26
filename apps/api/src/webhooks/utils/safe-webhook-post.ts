import * as dns from "node:dns";
import * as http from "node:http";
import * as https from "node:https";
import { isIP } from "node:net";

import { isBlockedIpAddress } from "src/link-preview/utils/ssrf-guard";

const TIMEOUT_MS = 10_000;
const USER_AGENT = "MentingoWebhooks/1.0 (+https://covuahocduong.com)";

export class WebhookDeliveryError extends Error {}

type LookupCallback = (
  err: NodeJS.ErrnoException | null,
  address: string | dns.LookupAddress[],
  family?: number,
) => void;

// Same drop-in dns.lookup replacement used by the link-preview fetcher —
// rejects any resolved address in a blocked range at connect time, closing
// the DNS-rebinding gap between "URL looked safe when the endpoint was
// created" and "URL still resolves somewhere safe right now".
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

export type SafeWebhookPostResult = { statusCode: number };

/**
 * POSTs a JSON body to an http(s) webhook endpoint with SSRF protection
 * (blocked-range check on literal IPs, safe DNS lookup, and a post-connect
 * remote-address re-check). Does not follow redirects — a webhook endpoint
 * that redirects is treated as a delivery failure rather than followed.
 * Only the status code is read back; the response body is discarded.
 */
export const postWebhookSafely = (
  targetUrl: string,
  body: string,
  headers: Record<string, string>,
): Promise<SafeWebhookPostResult> =>
  new Promise((resolve, reject) => {
    let url: URL;

    try {
      url = new URL(targetUrl);
    } catch {
      reject(new WebhookDeliveryError("Invalid URL"));
      return;
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      reject(new WebhookDeliveryError("Unsupported protocol"));
      return;
    }

    if (isIP(url.hostname) && isBlockedIpAddress(url.hostname)) {
      reject(new WebhookDeliveryError("Address not allowed"));
      return;
    }

    const transport = url.protocol === "https:" ? https : http;
    const payload = Buffer.from(body, "utf8");

    const req = transport.request(
      url,
      {
        method: "POST",
        timeout: TIMEOUT_MS,
        lookup: safeLookup as unknown as typeof dns.lookup,
        headers: {
          "User-Agent": USER_AGENT,
          "Content-Type": "application/json",
          "Content-Length": payload.length,
          ...headers,
        },
      },
      (res) => {
        const remoteAddress = res.socket?.remoteAddress?.replace(/^::ffff:/, "");
        if (remoteAddress && isBlockedIpAddress(remoteAddress)) {
          req.destroy();
          reject(new WebhookDeliveryError("Address not allowed"));
          return;
        }

        res.resume();
        res.on("end", () => resolve({ statusCode: res.statusCode ?? 0 }));
      },
    );

    req.on("timeout", () => req.destroy(new WebhookDeliveryError("Request timed out")));
    req.on("error", (err) =>
      reject(err instanceof Error ? err : new WebhookDeliveryError(String(err))),
    );
    req.write(payload);
    req.end();
  });
