import { isBlockedIpAddress } from "../ssrf-guard";

describe("isBlockedIpAddress", () => {
  it("blocks loopback addresses", () => {
    expect(isBlockedIpAddress("127.0.0.1")).toBe(true);
    expect(isBlockedIpAddress("::1")).toBe(true);
  });

  it("blocks private IPv4 ranges", () => {
    expect(isBlockedIpAddress("10.0.0.5")).toBe(true);
    expect(isBlockedIpAddress("172.16.0.1")).toBe(true);
    expect(isBlockedIpAddress("172.31.255.255")).toBe(true);
    expect(isBlockedIpAddress("192.168.1.1")).toBe(true);
  });

  it("does not block the 172.x range outside 16-31", () => {
    expect(isBlockedIpAddress("172.32.0.1")).toBe(false);
    expect(isBlockedIpAddress("172.15.0.1")).toBe(false);
  });

  it("blocks link-local addresses, including the cloud metadata IP", () => {
    expect(isBlockedIpAddress("169.254.169.254")).toBe(true);
    expect(isBlockedIpAddress("169.254.0.1")).toBe(true);
    expect(isBlockedIpAddress("fe80::1")).toBe(true);
  });

  it("blocks unspecified and broadcast addresses", () => {
    expect(isBlockedIpAddress("0.0.0.0")).toBe(true);
    expect(isBlockedIpAddress("255.255.255.255")).toBe(true);
    expect(isBlockedIpAddress("::")).toBe(true);
  });

  it("blocks IPv6 unique-local addresses", () => {
    expect(isBlockedIpAddress("fc00::1")).toBe(true);
    expect(isBlockedIpAddress("fd12:3456:789a::1")).toBe(true);
  });

  it("blocks an IPv4-mapped IPv6 loopback address", () => {
    expect(isBlockedIpAddress("::ffff:127.0.0.1")).toBe(true);
  });

  it("allows public IPv4 and IPv6 addresses", () => {
    expect(isBlockedIpAddress("8.8.8.8")).toBe(false);
    expect(isBlockedIpAddress("2001:4860:4860::8888")).toBe(false);
  });

  it("blocks a value that isn't a parseable IP address at all", () => {
    expect(isBlockedIpAddress("not-an-ip")).toBe(true);
  });
});
