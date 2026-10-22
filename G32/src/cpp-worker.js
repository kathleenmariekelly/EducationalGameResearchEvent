// cpp-worker.js — runs real C++ via the JSCPP interpreter off the main
// thread. Runaway code (e.g. infinite loops) is killed by the caller's
// watchdog, which terminates this worker so the UI never freezes.
//
// Pure client-side: no network, no API calls. Safe to publish statically.

importScripts("vendor/JSCPP.js");

// JSCPP attaches itself to the global scope (self.JSCPP) when loaded.
const JSCPP = self.JSCPP;

self.onmessage = function (e) {
  const code = e.data && e.data.code ? String(e.data.code) : "";
  let out = "";
  try {
    JSCPP.run(code, "", {
      stdio: {
        write: (s) => {
          out += s;
          // Guard against pathological output floods.
          if (out.length > 20000) throw new Error("Too much output.");
        },
      },
    });
    self.postMessage({ ok: true, output: out });
  } catch (err) {
    const msg = String((err && err.message) || err).split("\n")[0];
    self.postMessage({ ok: false, output: out, error: msg });
  }
};
