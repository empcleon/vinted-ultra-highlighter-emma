// ==UserScript==
// @name         Vinted Ultra Highlighter PRO + Config Panel – Emma Edition
// @namespace    https://github.com/empcleon/vinted-ultra-highlighter-emma
// @version      3.0
// @description  Resalta chollos en Vinted + Panel de configuración visual. Totalmente ajustable y optimizado para 2025.
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

    console.log("🔥 Ultra Highlighter con Panel de Config – Emma Edition activo");

    //---------------------------------------------
    // ★ CONFIGURACIÓN POR DEFECTO
    //---------------------------------------------
    const defaultConfig = {
        enabled: true,
        highlightColor: "#d6ffd8",
        borderColor: "#ff0000",
        keywordHighlight: true,
        priceHighlight: true,
        cheapLimit: 5,        // 5€ → chollo
        scanInterval: 1200,   // en ms
        extraKeywords: "nuevo,etiqueta,urge,mudanza,error"
    };

    //---------------------------------------------
    // ★ CARGAR CONFIG DESDE TAMpermonkey
    //---------------------------------------------
    const cfg = {...defaultConfig, ...GM_getValue("emmaConfig", {})};

    function saveConfig() {
        GM_setValue("emmaConfig", cfg);
    }

    //---------------------------------------------
    // ★ PANEL DE CONFIGURACIÓN VISUAL
    //---------------------------------------------
    GM_registerMenuCommand("⚙️ Configuración Highlighter Emma", openConfigPanel);

    function openConfigPanel() {

        // Si ya existe, no abrir dos veces
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

            <label>Color de resaltado:<br>
                <input type="color" id="emma_color" value="${cfg.highlightColor}">
            </label><br><br>

            <label>Color borde chollo:<br>
                <input type="color" id="emma_borderColor" value="${cfg.borderColor}">
            </label><br><br>

            <label>Palabras clave (coma separadas):<br>
                <input type="text" id="emma_keywords" value="${cfg.extraKeywords}" style="width:100%;">
            </label><br><br>

            <label>Precio chollo (máx €):<br>
                <input type="number" id="emma_price" value="${cfg.cheapLimit}" min="1" max="50">
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

        document.querySelector("#emma_close").onclick = () => panel.remove();

        document.querySelector("#emma_save").onclick = () => {
            cfg.enabled = document.querySelector("#emma_enabled").checked;
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

    //---------------------------------------------
    // ★ LÓGICA DE RESALTADO
    //---------------------------------------------
    function highlight() {
        if (!cfg.enabled) return;

        const keywords = cfg.extraKeywords
            .split(",")
            .map(k => k.trim().toLowerCase())
            .filter(k => k.length > 0);

        const cheapRegex = new RegExp(`\\b([1-${cfg.cheapLimit}],\\d{2})\\s?€`, "i");

        const items = document.querySelectorAll('.feed-grid__item, .WebItem_box__');

        items.forEach(item => {
            if (item.dataset._highlighted) return;
            item.dataset._highlighted = "true";

            const text = item.innerText.toLowerCase();

            // ★ Resaltar precios chollo
            if (cfg.priceHighlight && cheapRegex.test(text)) {
                item.style.border = `3px solid ${cfg.borderColor}`;
                item.style.borderRadius = "6px";
            }

            // ★ Resaltar palabras clave
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

    //---------------------------------------------
    // ★ Observador dinámico
    //---------------------------------------------
    setInterval(highlight, cfg.scanInterval);

})();

