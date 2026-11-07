// Approximate device profile from a User-Agent string, for Company OS login history. This is NOT a hardware ID: two
// laptops with the same browser and OS share a profile, and a browser can send any User-Agent it likes. It is good
// enough to notice "first sign-in from an iPhone" and to show people which kinds of devices use their account.
// Pure and dependency-free (tests/company-os-device.test.mjs).

export interface DeviceInfo {
  browser: string;
  browserVersion: string | null;
  os: string;
  deviceType: "desktop" | "mobile" | "tablet" | "unknown";
}

export function parseUserAgent(ua: string | null | undefined): DeviceInfo {
  const s = ua ?? "";
  const pick = (re: RegExp) => s.match(re)?.[1] ?? null;
  let browser = "Unknown";
  let browserVersion: string | null = null;
  const rules: [string, RegExp][] = [
    ["Edge", /Edg(?:e|A|iOS)?\/([\d.]+)/],
    ["Opera", /(?:OPR|Opera)\/([\d.]+)/],
    ["Samsung Internet", /SamsungBrowser\/([\d.]+)/],
    ["Firefox", /(?:Firefox|FxiOS)\/([\d.]+)/],
    ["Chrome", /(?:Chrome|CriOS)\/([\d.]+)/],
    ["Safari", /Version\/([\d.]+).*Safari\//],
  ];
  for (const [name, re] of rules) {
    const v = pick(re);
    if (v) { browser = name; browserVersion = v.split(".")[0]; break; }
  }

  let os = "Unknown";
  if (/iPad|iPhone|iPod/.test(s)) os = "iOS";
  else if (/Android/.test(s)) os = "Android";
  else if (/Windows NT/.test(s)) os = "Windows";
  else if (/CrOS/.test(s)) os = "ChromeOS";
  else if (/Mac OS X|Macintosh/.test(s)) os = "macOS";
  else if (/Linux/.test(s)) os = "Linux";

  let deviceType: DeviceInfo["deviceType"] = "unknown";
  if (/iPad|Tablet/.test(s) || (/Android/.test(s) && !/Mobile/.test(s))) deviceType = "tablet";
  else if (/Mobi|iPhone|iPod|Android/.test(s)) deviceType = "mobile";
  else if (os !== "Unknown") deviceType = "desktop";

  return { browser, browserVersion, os, deviceType };
}

/** Stable key for "have we seen this kind of device for this account before". Version is left out on purpose so a
 *  browser update is not reported as a new device. */
export function deviceProfileKey(d: DeviceInfo): string {
  return `${d.browser}|${d.os}|${d.deviceType}`.toLowerCase();
}

export function describeDevice(d: Pick<DeviceInfo, "browser" | "browserVersion" | "os" | "deviceType">): string {
  const b = d.browserVersion ? `${d.browser} ${d.browserVersion}` : d.browser;
  const type = d.deviceType === "unknown" ? "" : ` · ${d.deviceType}`;
  return `${b} on ${d.os}${type}`;
}
