/*
 * Injected at the top of <head> in every page of an older version's snapshot (scripts/versions/snapshot.mjs), served
 * under <base>/v/<n>/. Two jobs:
 * 1. Storage isolation: the snapshot shares the site's origin, so its localStorage/sessionStorage keys get a
 *    per-version prefix. An older version's sample data or theme choice never reaches the current site, or the reverse.
 * 2. A small "Older version" pill (shadow DOM, so the old page's styles can't touch it) to switch to another version
 *    or back to the current one, on the same page where that version has it.
 */
(function () {
  var me = document.currentScript;
  var id = me && me.getAttribute("data-version");
  var base = (me && me.getAttribute("data-base")) || "";
  if (!id) return;

  var P = "bgv:" + id + ":";
  var S = Storage.prototype, get = S.getItem, set = S.setItem, del = S.removeItem, key = S.key;
  S.getItem = function (n) { return get.call(this, P + n); };
  S.setItem = function (n, v) { return set.call(this, P + n, v); };
  S.removeItem = function (n) { return del.call(this, P + n); };
  S.clear = function () { for (var i = this.length - 1; i >= 0; i--) { var n = key.call(this, i); if (n && n.indexOf(P) === 0) del.call(this, n); } };

  var root = base + "/v/" + id;
  function rest() { var p = location.pathname; return (p.indexOf(root) === 0 ? p.slice(root.length) : "/") || "/"; }
  function href(v) { return (v.current ? base : base + "/v/" + v.n) + rest() + location.search + location.hash; }

  function mount() {
    if (document.getElementById("bg-version-pill")) return;
    var host = document.createElement("div");
    host.id = "bg-version-pill";
    host.style.cssText = "position:fixed;left:12px;bottom:12px;z-index:2147483647";
    var sh = host.attachShadow({ mode: "open" });
    sh.innerHTML =
      "<style>" +
      ":host{all:initial}*{box-sizing:border-box;font:600 13px/1.3 Inter,system-ui,sans-serif}" +
      ".pill{display:flex;align-items:stretch;background:#0c0d0c;color:#fff;border:2px solid #22dd8f;box-shadow:0 6px 24px rgba(0,0,0,.35)}" +
      "button,a{all:unset;box-sizing:border-box;cursor:pointer;display:flex;align-items:center;gap:6px;min-height:40px;padding:0 12px;color:inherit}" +
      "button:focus-visible,a:focus-visible{outline:2px solid #22dd8f;outline-offset:-4px}" +
      ".cur{background:#22dd8f;color:#0c0d0c}" +
      ".x{padding:0 10px;opacity:.7}" +
      "ul{all:unset;display:block;position:absolute;left:0;bottom:calc(100% + 6px);min-width:280px;max-width:calc(100vw - 24px);background:#0c0d0c;color:#fff;border:2px solid #22dd8f;padding:4px 0}" +
      "li{display:block}li a{display:flex;justify-content:space-between;gap:12px;width:100%}li a:hover{background:#1d211e}" +
      "li a[aria-current]{color:#22dd8f}small{font-weight:400;opacity:.7}" +
      "</style><div class=pill><button class=open aria-haspopup=true aria-expanded=false></button><a class=cur>Back to current</a><button class=x aria-label='Hide the version switcher'>×</button></div>";
    var open = sh.querySelector(".open"), cur = sh.querySelector(".cur"), x = sh.querySelector(".x"), pill = sh.querySelector(".pill");
    cur.href = base + rest() + location.search + location.hash;
    x.onclick = function () { hidden = true; host.remove(); };
    fetch(base + "/versions.json").then(function (r) { return r.json(); }).then(function (vs) {
      var mine = vs.filter(function (v) { return String(v.n) === id; })[0];
      open.innerHTML = "Older version · v" + id + (mine ? " · " + mine.name : "") + " <span aria-hidden=true>▴</span>";
      var list = null;
      function close() { if (list) { list.remove(); list = null; open.setAttribute("aria-expanded", "false"); } }
      open.onclick = function () {
        if (list) return close();
        list = document.createElement("ul");
        list.setAttribute("role", "list");
        vs.forEach(function (v) {
          var li = document.createElement("li"), a = document.createElement("a");
          a.href = href(v);
          if (String(v.n) === id) a.setAttribute("aria-current", "page");
          a.innerHTML = "<span>v" + v.n + " · " + v.name + (v.current ? " (current)" : "") + "</span><small>" + v.date + "</small>";
          li.appendChild(a); list.appendChild(li);
        });
        var all = document.createElement("li"), h = document.createElement("a");
        h.href = base + "/versions/"; h.textContent = "Version history"; all.appendChild(h); list.appendChild(all);
        pill.parentNode.insertBefore(list, pill);
        open.setAttribute("aria-expanded", "true");
        list.querySelector("a").focus();
      };
      sh.addEventListener("keydown", function (e) { if (e.key === "Escape") { close(); open.focus(); } });
    }).catch(function () { open.textContent = "Older version · v" + id; });
    document.body.appendChild(host);
  }
  // After hydration, so React never sees a node it didn't render; put back if a client navigation drops it.
  var hidden = false;
  function start() { mount(); new MutationObserver(function () { if (!hidden) mount(); }).observe(document.body, { childList: true }); }
  if (document.readyState === "complete") setTimeout(start, 300); else addEventListener("load", function () { setTimeout(start, 300); });
})();
