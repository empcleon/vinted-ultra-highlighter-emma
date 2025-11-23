// ==UserScript==
// @name         Vinted Ultra Highlighter PRO – Emma Edition (Mini/Micro + Marcas)
// @namespace    https://github.com/empcleon/vinted-ultra-highlighter-emma
// @version      4.0
// @description  Sniper avanzado para chollos en Vinted: vestidos mini/micro, zapatos 42, marcas TOP y panel completo.
// @author       Emma
// @match        https://www.vinted.es/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @run-at       document-end
// @updateURL    https://raw.githubusercontent.com/empcleon/vinted-ultra-highlighter-emma/main/vinted-ultra-highlighter.user.js
// @downloadURL  https://raw.githubusercontent.com/empcleon/vinted-ultra-highlighter-emma/main/vinted-ultra-highlighter.user.js
// ==/UserScript==

(function() {
    'use strict';

    const defaultConfig = {
        enabled: true,
        highlightColor: "#d6ffd8",
        borderColor: "#ff0000",
        cheapLimit: 5,
        keywordHighlight: true,
        extraKeywords: "nuevo,etiqueta,urge,mudanza,error",
        scanInterval: 1200,
        modeDressOnly: false,
        modeMiniOnly: false,
        modeShoes42: false,
        modeBrandFilter: false
    };

    const cfg = {...defaultConfig, ...GM_getValue("emmaConfig", {})};
    function saveConfig() { GM_setValue("emmaConfig", cfg); }

    GM_registerMenuCommand("⚙️ Configuración Highlighter Emma", openConfig);

    function openConfig() {
        if (document.querySelector("#emma-config-panel")) return;

        const panel = document.createElement("div");
        panel.id = "emma-config-panel";
        panel.style = `
            position: fixed; top: 50px; right: 50px; width: 360px;
            background: #fff; padding: 20px; border-radius: 12px;
            z-index: 9999999; box-shadow: 0 0 15px rgba(0,0,0,0.3);
            font-family: Arial;
        `;

        panel.innerHTML = `
            <h2>⚙️ Highlighter Emma</h2>

            <label><input type="checkbox" id="emma_enabled"> Activar</label><br><br>

            <label><input type="checkbox" id="dress_only"> Solo vestidos</label><br><br>

            <label><input type="checkbox" id="mini_only"> Solo mini/micro</label><br>
            <small>Filtra vestidos ultracortos.</small><br><br>

            <label><input type="checkbox" id="shoes42"> Zapatos talla 42</label><br><br>

            <label><input type="checkbox" id="brand_mode"> Solo marcas TOP (H&M, Zara, Mango, Tally)</label><br><br>

            <hr>

            <label>Color resaltado:<br><input type="color" id="emma_color" value="${cfg.highlightColor}"></label><br><br>
            <label>Borde chollo:<br><input type="color" id="emma_border" value="${cfg.borderColor}"></label><br><br>

            <label>Máx € chollo:<br><input type="number" id="price_limit" value="${cfg.cheapLimit}"></label><br><br>

            <button id="save" style="background:#28a745;color:white;padding:6px 12px;border-radius:6px;border:none;cursor:pointer;">Guardar</button>
            <button id="close" style="background:#d9534f;color:white;padding:6px 12px;border-radius:6px;border:none;margin-left:10px;cursor:pointer;">Cerrar</button>
        `;

        document.body.appendChild(panel);

        document.querySelector("#emma_enabled").checked = cfg.enabled;
        document.querySelector("#dress_only").checked = cfg.modeDressOnly;
        document.querySelector("#mini_only").checked = cfg.modeMiniOnly;
        document.querySelector("#shoes42").checked = cfg.modeShoes42;
        document.querySelector("#brand_mode").checked = cfg.modeBrandFilter;

        document.querySelector("#close").onclick = () => panel.remove();

        document.querySelector("#save").onclick = () => {
            cfg.enabled = document.querySelector("#emma_enabled").checked;
            cfg.modeDressOnly = document.querySelector("#dress_only").checked;
            cfg.modeMiniOnly = document.querySelector("#mini_only").checked;
            cfg.modeShoes42 = document.querySelector("#shoes42").checked;
            cfg.modeBrandFilter = document.querySelector("#brand_mode").checked;
            cfg.highlightColor = document.querySelector("#emma_color").value;
            cfg.borderColor = document.querySelector("#emma_border").value;
            cfg.cheapLimit = parseFloat(document.querySelector("#price_limit").value);

            saveConfig();
            alert("Configuración guardada ✓");
            panel.remove();
        };
    }

    //--------------------------------------------------------------------
    // Filtros REGEX
    //--------------------------------------------------------------------

    const dressRegex = /\bvestid[oa]?\b|\bdress\b/i;

    const miniRegex = /\b(mini|micro|mini[-\s]?dress|minivestido|vestid[oa] (mini|corto)|bodycon|ultra mini)\b/i;

    const shoes42Regex = /\b(42|talla 42|size 42|eu 42|uk 8)\b/i;
    const shoeKeywords = /\b(zapatos?|tacones?|botas?|botines?|heels|pumps)\b/i;

    const brandRegex =
        /\b(h[\W_]?&[\W_]?m|hm|h m|zara|zra|mango|mngo|tally ?we(ijl|ilj|ijl)|tally)\b/i;

    //--------------------------------------------------------------------
    // Highlight function
    //--------------------------------------------------------------------
    function highlight() {
        if (!cfg.enabled) return;

        const items = document.querySelectorAll('.feed-grid__item, .WebItem_box__');

        const cheapRegex = new RegExp(`\\b([1-${cfg.cheapLimit}],\\d{2})\\s?€`, "i");

        for (let item of items) {
            const text = item.innerText.toLowerCase();

            if (cfg.modeDressOnly && !dressRegex.test(text)) continue;

            if (cfg.modeMiniOnly && !miniRegex.test(text)) continue;

            if (cfg.modeShoes42) {
                if (!shoes42Regex.test(text)) continue;
                if (!shoeKeywords.test(text)) continue;
            }

            if (cfg.modeBrandFilter && !brandRegex.test(text)) continue;

            if (cheapRegex.test(text)) {
                item.style.border = `3px solid ${cfg.borderColor}`;
            }

            item.style.backgroundColor = cfg.highlightColor;
        }
    }

    setInterval(highlight, cfg.scanInterval);
})();
