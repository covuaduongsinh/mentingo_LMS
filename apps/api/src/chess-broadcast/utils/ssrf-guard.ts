import { isIP } from "node:net";

/**
 * Blocks loopback, private, link-local (including the common cloud metadata
 * address 169.254.169.254), and unspecified/broadcast IP ranges so the PGN
 * fetcher can never be used to probe internal network services.
 */
export const isBlockedIpAddress = (address: string): boolean => {
  const version = isIP(address);

  if (version === 4) return isBlockedIpv4(address);
  if (version === 6) return isBlockedIpv6(address);

  // Not a parseable IP address at all — treat as blocked rather than risk
  // passing an unvalidated value further down the pipeline.
  return true;
};

const isBlockedIpv4 = (address: string): boolean => {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((octet) => Number.isNaN(octet))) return true;

  const [a, b] = octets;

  if (a === 127) return true; // loopback
  if (a === 10) return true; // private
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata
  if (a === 0) return true; // "this network" / unspecified
  if (address === "255.255.255.255") return true; // broadcast

  return false;
};

const isBlockedIpv6 = (address: string): boolean => {
  const normalized = address.toLowerCase();

  if (normalized === "::1") return true; // loopback
  if (normalized === "::") return true; // unspecified
  if (normalized.startsWith("fe80:")) return true; // link-local
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // unique local (fc00::/7)
  if (normalized.startsWith("::ffff:")) {
    // IPv4-mapped IPv6 address — validate the embedded IPv4 address too.
    const mapped = normalized.replace("::ffff:", "");
    if (isIP(mapped) === 4) return isBlockedIpv4(mapped);
  }

  return false;
};
