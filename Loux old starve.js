// =====================================================
// Loux old starve.js — AutoCraft for Old Starve Client
// =====================================================
// LOAD ORDER:  Client code.js  →  Loux old starve.js
// Packet craft: [7, itemId] via FT.GM()
// Press O to open settings, K to toggle autocraft
// =====================================================

(function() {
    "use strict";

    // ---- Wait for DOM + client globals ----
    function init() {
        if (typeof FT === "undefined") return setTimeout(init, 200);
        if (typeof m === "undefined")  return setTimeout(init, 200);
        if (!document.body)           return setTimeout(init, 100);

        console.log("%c[LouxOld] %cAutoCraft starting...",
            "color:#0ff;font-weight:bold", "color:#aaa");

        buildSettings();
        wrapFT();
        startLoops();
        injectUI();
    }

    // =====================================================
    // SETTINGS (matches Loux.js Settings.AutoCraft pattern)
    // =====================================================
    var S = {
        AutoCraft:   { e: false, k: "KeyK" },
        AutoRecycle: { e: false, k: "KeyL" },
        AutoFeed:    true
    };
    window.lastCrafted = -1;

    function buildSettings() {
        // Expose like Loux.js does
        window.Settings = window.Settings || {};
        window.Settings.AutoCraft   = S.AutoCraft;
        window.Settings.AutoRecycle = S.AutoRecycle;
    }

    // =====================================================
    // WRAP FT.GM to track last crafted item
    // =====================================================
    function wrapFT() {
        if (!FT.GM || FT._louxWrapped) return;
        var orig = FT.GM;
        FT.GM = function(id) {
            if (id !== undefined && id >= 0) window.lastCrafted = id;
            return orig.call(this, id);
        };
        FT._louxWrapped = true;
        console.log("[LouxOld] Hooked FT.GM — craft tracking active");
    }

    // =====================================================
    // LOOPS
    // =====================================================
    function startLoops() {
        // ---- Craft loop (150ms) ----
        setInterval(function() {
            if (!S.AutoCraft.e) return;
            if (!FT.rc || FT.rc.readyState !== 1) return;
            if (!m.xr || m.Jq) return;                         // not in-game / dead
            if (m.pM && (m.pM.id >= 0 || m.pM.Zw >= 0)) return; // holding item / cooldown
            if (window.lastCrafted < 0) return;

            if (S.AutoFeed && m.J0) m.J0.enabled = true;       // keep auto-feed on
            FT.GM(window.lastCrafted);
        }, 150);

        // ---- Recycle loop (200ms) ----
        setInterval(function() {
            if (!S.AutoRecycle.e) return;
            if (!FT.rc || FT.rc.readyState !== 1) return;
            if (!m.xr || m.Jq) return;
            if (window.lastCrafted < 0) return;
            FT.rc.send(JSON.stringify([29, window.lastCrafted]));
        }, 200);

        // ---- HUD updater ----
        setInterval(updateHUD, 400);
    }

    // =====================================================
    // KEYBOARD — toggle keys + keybind capture
    // =====================================================
    var waitingForKey = null, keyTarget = null;

    document.addEventListener("keydown", function(e) {
        // If waiting for keybind...
        if (waitingForKey) {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (e.code === "Escape") { waitingForKey = null; keyTarget = null; refreshUI(); return; }
            waitingForKey(e.code);
            waitingForKey = null;
            keyTarget = null;
            refreshUI();
            return;
        }

        // Toggle keys
        if (e.code === S.AutoCraft.k) {
            S.AutoCraft.e = !S.AutoCraft.e;
            if (S.AutoCraft.e && S.AutoFeed && m.J0) m.J0.enabled = true;
            refreshUI();
            e.preventDefault();
        }
        if (e.code === S.AutoRecycle.k) {
            S.AutoRecycle.e = !S.AutoRecycle.e;
            refreshUI();
            e.preventDefault();
        }
        // Panel toggle
        if (e.code === "KeyO") {
            togglePanel();
            e.preventDefault();
        }
    }, true); // useCapture = true to beat game handlers

    // =====================================================
    // UI INJECTION
    // =====================================================
    var panel, body, hud;

    function injectUI() {
        // --- Settings panel ---
        panel = document.createElement("div");
        panel.id = "louxPanel";
        panel.innerHTML = [
            '<div style="background:rgba(3,16,34,0.94);color:#fff;font:16px Arial,sans-serif;',
            'border:2px solid rgb(62,125,215);border-radius:6px;padding:16px 20px;',
            'min-width:280px;box-shadow:0 0 40px rgba(0,0,0,0.8);">',
              '<div style="font-size:18px;font-weight:bold;color:rgb(0,255,255);',
              'border-bottom:1px solid rgb(62,125,215);padding-bottom:6px;margin-bottom:10px;">',
                '⚙ AutoCraft &amp; Recycle</div>',
              '<div id="louxBody"></div>',
              '<div style="margin-top:10px;padding-top:6px;border-top:1px solid #333;',
              'font-size:11px;color:#666;text-align:center;">',
                'Press <b style="color:rgb(0,255,255);">O</b> to toggle &bull; ',
                '<b style="color:rgb(0,255,255);">K</b> AC &bull; ',
                '<b style="color:rgb(0,255,255);">L</b> Recycle</div>',
            '</div>'
        ].join("");
        panel.style.cssText = "display:none;position:fixed;top:50%;left:50%;" +
            "transform:translate(-50%,-50%);z-index:99999;";
        document.body.appendChild(panel);

        body = document.getElementById("louxBody");

        // --- HUD overlay ---
        hud = document.createElement("div");
        hud.id = "louxHUD";
        hud.style.cssText = "position:fixed;bottom:55px;right:12px;color:#0f0;" +
            "font:12px monospace;z-index:9999;pointer-events:none;display:none;" +
            "background:rgba(0,0,0,0.65);padding:3px 7px;border-radius:4px;" +
            "border:1px solid #333;text-align:right;";
        document.body.appendChild(hud);

        refreshUI();
        console.log("[LouxOld] UI injected. Press O to open panel.");
    }

    function togglePanel() {
        if (!panel) return;
        var show = panel.style.display === "none";
        panel.style.display = show ? "block" : "none";
        if (show) refreshUI();
    }

    // =====================================================
    // UI RENDERING
    // =====================================================
    function refreshUI() {
        if (!body) return;
        body.innerHTML = "";

        addRow("checkbox", "AutoCraft",        S.AutoCraft.e,   function(v) { S.AutoCraft.e   = v; refreshUI(); });
        addRow("checkbox", "AutoRecycle",      S.AutoRecycle.e, function(v) { S.AutoRecycle.e = v; refreshUI(); });
        addRow("spacer");
        addRow("keybind",  "AutoCraft Key:",   S.AutoCraft.k,   function(k) { S.AutoCraft.k   = k; refreshUI(); });
        addRow("keybind",  "AutoRecycle Key:", S.AutoRecycle.k, function(k) { S.AutoRecycle.k = k; refreshUI(); });
        addRow("spacer");
        addRow("display",  "Last Crafted:",    getCraftName());
        addRow("checkbox", "Auto-Feed",        S.AutoFeed,      function(v) { S.AutoFeed = v; if (!v && m.J0) m.J0.enabled = false; refreshUI(); });
    }

    function addRow(type, label, value, onChange) {
        var row = document.createElement("div");
        row.style.cssText = "margin:4px 0;display:flex;align-items:center;gap:8px;";

        if (type === "spacer") {
            row.style.cssText = "height:6px;";
            body.appendChild(row);
            return;
        }

        if (type === "checkbox") {
            var cb = document.createElement("input");
            cb.type = "checkbox";
            cb.checked  = !!value;
            cb.style.cssText = "width:15px;height:15px;cursor:pointer;accent-color:#4caf50;flex-shrink:0;";
            cb.onchange = function() { onChange(cb.checked); };
            var lbl = document.createElement("span");
            lbl.textContent = label;
            lbl.style.cssText = "color:#ccc;cursor:pointer;font-size:14px;";
            lbl.onclick = function() { cb.checked = !cb.checked; onChange(cb.checked); };
            row.appendChild(cb);
            row.appendChild(lbl);
            body.appendChild(row);
            return;
        }

        if (type === "display") {
            var sp = document.createElement("span");
            sp.textContent = label + " " + value;
            sp.style.cssText = "color:#888;font-size:12px;";
            row.appendChild(sp);
            body.appendChild(row);
            return;
        }

        if (type === "keybind") {
            var l2 = document.createElement("span");
            l2.textContent = label;
            l2.style.cssText = "color:#ccc;font-size:13px;flex:1;";

            var ks = document.createElement("span");
            ks.textContent = value;
            ks.style.cssText = "color:rgb(0,255,255);font-weight:bold;font-size:12px;" +
                "background:rgba(0,0,0,0.4);padding:2px 8px;border-radius:3px;";

            var btn = document.createElement("button");
            btn.textContent = "Set";
            btn.style.cssText = "background:rgb(62,125,215);color:#fff;border:none;" +
                "border-radius:3px;padding:3px 8px;cursor:pointer;font-size:11px;";
            btn.onclick = function() {
                waitingForKey = onChange;
                keyTarget = ks;
                if (ks) { ks.textContent = "..."; ks.style.color = "#0f0"; }
            };

            row.appendChild(l2);
            row.appendChild(ks);
            row.appendChild(btn);
            body.appendChild(row);
        }
    }

    function getCraftName() {
        var id = window.lastCrafted;
        if (id < 0) return "None (craft something first)";
        try {
            if (typeof C !== "undefined" && typeof Wa !== "undefined" && Wa[id])
                return C[Wa[id].WC].name;
        } catch(e) {}
        return "ID:" + id;
    }

    function updateHUD() {
        if (!hud) return;
        if (S.AutoCraft.e || S.AutoRecycle.e) {
            hud.style.display = "block";
            var p = [];
            if (S.AutoCraft.e)   p.push("AC:" + getCraftName());
            if (S.AutoRecycle.e) p.push("Recycle");
            hud.textContent = p.join(" | ");
        } else {
            hud.style.display = "none";
        }
    }

    // ---- START ----
    setTimeout(init, 50);

})();
