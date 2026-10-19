// chrome/content/prefs-dialog.mjs
/** biome-ignore-all lint/correctness/noInnerDeclarations: This would imply a total tewrite uneceesarily */
/** biome-ignore-all lint/suspicious/noRedundantUseStrict: This file is called inside a XHTML then the functions would be used so I cant garantee it would be safe */
/** biome-ignore-all lint/correctness/noUnusedVariables: This file is called inside a XHTML then the functions would be used */
//Took from the old XHTML for better work, but it needs to live inside there
//It is responsible by organizing the whole keys and preferences

"use strict";

const PREF_PREFIX = 'extensions.zotfetch.';

const DEFAULTS = {
  unpaywallEmail:        "",
  coreApiKey:            "",
  institutionalProxyUrl: "",
  enableCapesFallback:   true,
  proxyUrl:              "",
  fastMode:              true,
  batchSize:             30,
  requestDelayMs:        900,
  domainGapMs:           1500,
  antiCaptchaMode:       true,
  requestTimeoutMs:      15000,
  unpaywallTimeoutMs:    12000,
  crossrefTimeoutMs:     10000
};


//Acesso direto ao Zotero
function pget(k) { 
  const val = Zotero.Prefs.get(PREF_PREFIX + k, true);
  return val !== undefined ? val : DEFAULTS[k]; 
}
function pset(k,v) { Zotero.Prefs.set(PREF_PREFIX + k, v, true); }
// Sensitive credentials are stored in the Login Manager (encrypted), never
// in plain-text prefs.  Fall back to "" when the bridge is unavailable.
function pSecureGet(k) { 
  return (typeof ZotFetchPrefs !== "undefined" && ZotFetchPrefs.getSecure) ? ZotFetchPrefs.getSecure(k) : ""; 
}
function pSecureSet(k,v){ 
  if (typeof ZotFetchPrefs !== "undefined" && ZotFetchPrefs.setSecure) ZotFetchPrefs.setSecure(k, v); 
}

function g(id)         { return document.getElementById(id); }

// ── Load current values ─────────────────────────────────────────────────
function load() {
  const addonVersion = Zotero.Plugins ? Zotero.Plugins.get("zotfetch@edslab.research")?.version : "";
  if (addonVersion) g("ver").textContent = `v${addonVersion}`;

  g("f-email").value         = pSecureGet("unpaywallEmail")        || "";
  g("f-core").value          = pSecureGet("coreApiKey")            || "";
  g("f-proxy").value         = pSecureGet("institutionalProxyUrl") || "";
  g("f-capes-on").checked    = pget("enableCapesFallback") !== false;
  g("f-capes-url").value     = pSecureGet("proxyUrl")              || "";
  g("f-fast").checked        = pget("fastMode")              !== false;
  g("f-batch").value         = pget("batchSize")             ?? 30;
  g("f-delay").value         = pget("requestDelayMs")        ?? 900;
  g("f-gap").value           = pget("domainGapMs")           ?? 1500;
  g("f-anticaptcha").checked = pget("antiCaptchaMode")       !== false;
  g("f-timeout").value       = pget("requestTimeoutMs")      ?? 15000;
  g("f-uptimeout").value     = pget("unpaywallTimeoutMs")    ?? 12000;
  g("f-crtimeout").value     = pget("crossrefTimeoutMs")     ?? 10000;

  syncCapes();
}

// ── CAPES section gating ────────────────────────────────────────────────
function syncCapes() {
  var on = g("f-capes-on").checked;
  g("capes-block").style.opacity = on ? "1" : "0.4";
  g("f-capes-url").disabled      = !on;
}
g("f-capes-on").addEventListener("change", syncCapes);

// ── Validation ──────────────────────────────────────────────────────────
function showError(msg) {
  var el = g("errMsg");
  el.textContent = `\u26A0 ${msg}`;
  el.style.display = "block";
  el.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
function clearError() {
  var el = g("errMsg");
  el.style.display = "none";
  el.textContent = "";
}

function validate() {
  var email = g("f-email").value.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    g("f-email").focus();
    showError("Please enter a valid email address, or leave it empty to use the built-in fallback.");
    return false;
  }
  var numRules = [
    ["f-batch",    "Batch size",             1,   500],
    ["f-delay",    "Delay between items",    0, 30000],
    ["f-gap",      "Domain gap",             0, 30000],
    ["f-timeout",  "Request timeout",     5000, 120000],
    ["f-uptimeout","Unpaywall timeout",   5000,  60000],
    ["f-crtimeout","CrossRef timeout",    5000,  60000]
  ];
  for (var i = 0; i < numRules.length; i++) {
    var rule  = numRules[i];
    var val   = parseInt(g(rule[0]).value, 10);
    if (Number.isNaN(val) || val < rule[2] || val > rule[3]) {
      g(rule[0]).focus();
      showError(`${rule[1]} must be a number between ${rule[2]} and ${rule[3]}.`);
      return false;
    }
  }
  return true;
}

// ── Save ────────────────────────────────────────────────────────────────
function savePrefs() {
  clearError();
  if (!validate()) return;

  pSecureSet("unpaywallEmail",        g("f-email").value.trim());
  pSecureSet("coreApiKey",            g("f-core").value.trim());
  pSecureSet("institutionalProxyUrl", g("f-proxy").value.trim());
  pset("enableCapesFallback",         g("f-capes-on").checked);
  pSecureSet("proxyUrl",              g("f-capes-url").value.trim());
  pset("fastMode",              g("f-fast").checked);
  pset("batchSize",             parseInt(g("f-batch").value,     10));
  pset("requestDelayMs",        parseInt(g("f-delay").value,     10));
  pset("domainGapMs",           parseInt(g("f-gap").value,       10));
  pset("antiCaptchaMode",       g("f-anticaptcha").checked);
  pset("requestTimeoutMs",      parseInt(g("f-timeout").value,   10));
  pset("unpaywallTimeoutMs",    parseInt(g("f-uptimeout").value,  10));
  pset("crossrefTimeoutMs",     parseInt(g("f-crtimeout").value,  10));

  window.close();
}

// ── Reset Defaults ──────────────────────────────────────────────────────
function resetDefaults() {
  if (!window.confirm("Reset all ZotFetch settings to their default values?\nThis cannot be undone.")) return;
  g("f-email").value         = DEFAULTS.unpaywallEmail;
  g("f-core").value          = DEFAULTS.coreApiKey;
  g("f-proxy").value         = DEFAULTS.institutionalProxyUrl;
  g("f-capes-on").checked    = DEFAULTS.enableCapesFallback;
  g("f-capes-url").value     = DEFAULTS.proxyUrl;
  g("f-fast").checked        = DEFAULTS.fastMode;
  g("f-batch").value         = DEFAULTS.batchSize;
  g("f-delay").value         = DEFAULTS.requestDelayMs;
  g("f-gap").value           = DEFAULTS.domainGapMs;
  g("f-anticaptcha").checked = DEFAULTS.antiCaptchaMode;
  g("f-timeout").value       = DEFAULTS.requestTimeoutMs;
  g("f-uptimeout").value     = DEFAULTS.unpaywallTimeoutMs;
  g("f-crtimeout").value     = DEFAULTS.crossrefTimeoutMs;
  syncCapes();
  clearError();
}

// ── Keyboard shortcuts ──────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", load);
window.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); savePrefs(); }
  if (e.key === "Escape") window.close();
});
// ── Help ────────────────────────────────────────────────────────────────────
function openHelp() {
  var url = "https://github.com/fdossi/zotfetch/wiki";
  try {
    // Zotero 8 cross-platform launcher
    if (typeof Zotero !== "undefined" && Zotero.launchURL) {
      Zotero.launchURL(url);
    } else {
      // Fallback: use the opener chrome window's launchURL
      var win = window.opener ||
        (window.arguments?.[0]?._chromeWin);
      if (win?.Zotero?.launchURL) {
        win.Zotero.launchURL(url);
      } else {
        window.open(url, "_blank");
      }
    }
  } catch(e) {
    window.open(url, "_blank");
  }
}

window.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
  load();
}, 50);;
});