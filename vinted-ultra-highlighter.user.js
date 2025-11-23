// ==UserScript==
// @name         Vinted Ultra Highlighter PRO – Emma Edition
// @namespace    https://github.com/empcleon/vinted-ultra-highlighter-emma
// @version      2.0
// @description  Resalta chollos automáticamente en Vinted: palabras clave, precios bajos y artículos nuevos. Optimizado 2025.
// @author       Emma
// @match        https://www.vinted.es/catalog*
// @match        https://www.vinted.es/*
// @icon         https://www.vinted.es/favicon.ico
// @grant        none
// @run-at       document-end
// @updateURL    https://raw.githubusercontent.com/empcleon/vinted-ultra-highlighter-emma/main/vinted-ultra-highlighter.user.js
// @downloadURL  https://raw.githubusercontent.com/empcleon/vinted-ultra-highlighter-emma/main/vinted-ultra-highlighter.user.js
// ==/UserScript==

(function() {
    'use strict';

    console.log("🔥 Vinted Ultra Highlighter PRO – Emma Edition cargado");

    const keywords = [
        "nuevo", "nuev@", "etiqueta", "etiquetas",
        "urge", "urgente", "mudanza", "liquidación",
        "error", "regalo", "sin usar", "estrenar"
    ];

    // Detecta precios demasiado bajos
    const cheapRegex = /\b([1-5],[0-9]{2})\s?€\b/;

    function highlight() {
        const items = document.querySelectorAll('.feed-grid__item, .WebItem_box__');

        items.forEach(item => {
            if (item.dataset._highlighted) return;
            item.dataset._highlighted = "true";

            const text = item.innerText.toLowerCase();

            // 🔴 Oferta sospechosa (precio ultra barato)
            if (cheapRegex.test(text)) {
                item.style.border = "3px solid red";
                item.style.borderRadius = "6px";
            }

            // 🟢 Palabras clave de chollo
            for (let word of keywords) {
                if (text.includes(word)) {
                    item.style.backgroundColor = "#d6ffd8";
                    item.style.padding = "4px";
                    break;
                }
            }
        });
    }

    // Observa cambios dinámicos en la página
    const observer = new MutationObserver(() => highlight());
    observer.observe(document.body, { childList: true, subtree: true });

    // Primera ejecución
    setTimeout(highlight, 1200);
})();
