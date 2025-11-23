// ==UserScript==
// @name         Vinted Ultra Highlighter PRO + Config Panel – Emma Edition
// @namespace    https://github.com/empcleon/vinted-ultra-highlighter-emma
// @version      3.5
// @description  Resalta chollos en Vinted + Panel con control total (modos vestidos y zapatos 42 incluidos). Optimizado 2025.
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

    console.log("🔥 Ultra Highlighter Emma Edition + Vestidos & Talla 42 cargado");

    const defaultConfig = {
        enabled: true,
        highlightColor: "#d6ffd8",
        borderColor: "#ff0000",
        keywordHighlight: true,
        priceHighlight: true,
        cheapLimit: 5,
        scanInterval: 1200,
        extraKeywords: "nuevo,etiqueta,urge,mudanza,error",
        modeDressOnly: false,
        modeShoes42: false
    };

    const cfg = {...defaultConfig, ...GM_getValue("emmaConfig", {})};

    function saveConfig() { GM_setValue("emmaConfig", cfg); }

    GM_registerMenuCommand("⚙️ Configuración Highlighter Emma", openConfigPanel);

    function openConfigPanel() {

        if (document.querySelector("#emma-config-panel")) return;

        const panel = document.createElement("div");
        panel.id = "emma-config-panel";
        panel.style = `
            position: fixed;
            top: 50px;
            right: 50px;
            width: 360px;
            background: #ffffff;
            border-radius: 12px;
            padding: 20px;
            z-index: 9999999;
            box-shadow: 0 0 20px rgba(0,0,0,0.2);
            font-family: Arial, sans-serif;
        `;

        panel.innerHTML = `
            <h2 style="margin-top:0;margin-bottom:10px;">⚙️ Configuración Emma</h2>

            <label><input type="checkbox" id="emma_enabled"> Activar script</label><br><br>

            <label><input type="checkbox" id="emma_modeDress"> Solo vestidos</label><br>
            <small>Oculta todo lo que no sea vestido.</small><br><br>

            <label><input type="checkbox" id="emma_modeShoes"> Zapatos talla 42</label><br>
            <small>Resalta solo zapatos & tacones talla 42.</small><br><br>

            <hr>

            <label>Color de resaltado:<br>
                <input type="color" id="emma_color" value="${cfg.highlightColor}">
            </label><br><br>

            <label>Color borde chollo:<br>
                <input type="color" id="emma_borderColor" value="${cfg.borderColor}">
            </label><br><br>

            <label>Palabras clave:<br>
                <input type="text" id="emma_keywords" value="${cfg.extraKeywords}" style="width:100%;">
            </label><br><br>

            <label>Máx € chollo:<br>
                <input type="number" id="emma_price" value="${cfg.cheapLimit}">
            </label><br><br>

            <label>Velocidad de escaneo (ms):<br>
                <input type="number" id="emma_scan" value="${cfg.scanInterval}">
            </label><br><br>

            <button id="emma_save" style="padding:8px 15px;background:#28a745;color:white;border:none;border-radius:6px;cursor:pointer;">
                Guardar
            </button>

            <button id="emma_close" style="padding:8px 15px;background:#dc3545;color:white;border:none;border-radius:6px;cursor:pointer;margin-left:10px;">
                Cerrar
            </button>
        `;

        document.body.appendChild(panel);

        document.querySelector("#emma_enabled").checked = cfg.enabled;
        document.querySelector("#emma_modeDress").checked = cfg.modeDressOnly;
        document.querySelector("#emma_modeShoes").checked = cfg.modeShoes42;

        document.querySelector("#emma_close").onclick = () => panel.remove();

        document.querySelector("#emma_save").onclick = () => {
            cfg.enabled = document.querySelector("#emma_enabled").checked;
            cfg.modeDressOnly = document.querySelector("#emma_modeDress").checked;
            cfg.modeShoes42 = document.querySelector("#emma_modeShoes").checked;
            cfg.highlightColor = document.querySelector("#emma_color").value;
            cfg.borderColor = document.querySelector("#emma_borderColor").value;
            cfg.extraKeywords = document.querySelector("#emma_keywords").value;
            cfg.cheapLimit = parseFloat(document.querySelector("#emma_price").value);
            cfg.scanInterval = parseInt(document.querySelector("#emma_scan").value);

            saveConfig();
            alert("Configuración guardada ✓");
            panel.remove();
        };
    }

    //------------------------------------------------------
    // FILTROS ESPECIALES
    //------------------------------------------------------
    const dressRegex = /\bvestid[oa]?\b|\bdress\b|\bmini\b|\bmicro\b/i;

    const shoes42Regex =
        /\b42\b|\btalla 42\b|\bsize 42\b|\beu 42\b|\buk 8\b/i;

    const shoeKeywords =
        /\bzapatos?\b|\btacones?\b|\bbotas?\b|\bbotines?\b|\bheels\b|\bpumps\b/i;

    //------------------------------------------------------
    // LÓGICA DE HIGHLIGHT
    //------------------------------------------------------
    function highlight() {
        if (!cfg.enabled) return;

        const keywords = cfg.extraKeywords.split(",").map(k => k.trim().toLowerCase());

        const cheapRegex = new RegExp(`\\b([1-${cfg.cheapLimit}],\\d{2})\\s?€`, "i");

        const items = document.querySelectorAll('.feed-grid__item, .WebItem_box__');

        items.forEach(item => {
            const text = item.innerText.toLowerCase();

            // 🔵 Modo SOLO VESTIDOS
            if (cfg.modeDressOnly && !dressRegex.test(text)) return;

            // 👠 Modo ZAPATOS TALLA 42
            if (cfg.modeShoes42) {
                if (!shoes42Regex.test(text)) return;
                if (!shoeKeywords.test(text)) return;
            }

            if (item.dataset._highlighted) return;
            item.dataset._highlighted = "true";

            // 🔴 Precio chollo
            if (cfg.priceHighlight && cheapRegex.test(text)) {
                item.style.border = `3px solid ${cfg.borderColor}`;
                item.style.borderRadius = "6px";
            }

            // 🟢 Palabras clave
            if (cfg.keywordHighlight) {
                for (let w of keywords) {
                    if (text.includes(w)) {
                        item.style.backgroundColor = cfg.highlightColor;
                        item.style.padding = "4px";
                        break;
                    }
                }
            }
        });
    }

    setInterval(highlight, cfg.scanInterval);
})();

})();

