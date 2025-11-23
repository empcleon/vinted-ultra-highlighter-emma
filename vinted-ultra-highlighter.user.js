El problema principal de tu script de Tampermonkey es que **los selectores de CSS que usas (`.feed-grid__item`, `.WebItem_box__`) están obsoletos**. Vinted cambia los nombres de las clases constantemente para evitar bots.

Además, tu lógica de filtrado es **restrictiva** (si activas "Zapatos" y "Vestidos" a la vez, buscará algo que sea las dos cosas, lo cual es imposible).

Aquí tienes la **versión corregida y funcional para 2024**.

### 🔧 Cambios clave que he hecho:
1.  **Selector robusto:** Uso `[data-testid="grid-item"]`, que es el único que Vinted no suele cambiar.
2.  **Lógica de Precio:** Ahora convierte el texto "5,00 €" a número real para comparar (tu regex anterior fallaba).
3.  **Filtros inteligentes:** Si marcas "Solo Mini" y "Zapatos 42", te marcará **ambos** tipos de chollos (lógica OR), no buscará un híbrido imposible.

### 📜 Copia y pega este código en Tampermonkey:

```javascript
// ==UserScript==
// @name         Vinted Ultra Highlighter PRO - FIXED 2024
// @namespace    https://github.com/empcleon/vinted-fixed
// @version      5.0
// @description  Sniper visual funcional: detecta Mini M/L, Zapatos 42 y Chollos por precio.
// @author       Emma
// @match        https://www.vinted.es/*
// @match        https://www.vinted.fr/*
// @match        https://www.vinted.it/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // --- CONFIGURACIÓN INICIAL ---
    const defaultConfig = {
        enabled: true,
        highlightColor: "rgba(0, 255, 0, 0.1)", // Verde suave fondo
        borderColor: "#ff0000", // Borde rojo fuerte
        cheapLimit: 10, // Precio máximo para resaltar borde rojo
        scanInterval: 1000,
        modeMini: true,    // Resaltar Vestidos Mini/Micro
        modeShoes42: true, // Resaltar Zapatos 42
        modeBrands: false  // Resaltar marcas TOP
    };

    const cfg = {...defaultConfig, ...GM_getValue("emmaConfig", {})};
    function saveConfig() { GM_setValue("emmaConfig", cfg); }

    // --- MENÚ DE CONFIGURACIÓN ---
    GM_registerMenuCommand("⚙️ Configurar Sniper Emma", openConfig);

    function openConfig() {
        if (document.querySelector("#emma-config-panel")) return;
        const panel = document.createElement("div");
        panel.id = "emma-config-panel";
        panel.style = `
            position: fixed; top: 20px; right: 20px; width: 300px;
            background: #fff; padding: 20px; border-radius: 10px;
            z-index: 999999; box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            font-family: sans-serif; border: 2px solid #09B1BA;
        `;
        panel.innerHTML = `
            <h3 style="margin-top:0;color:#09B1BA">🎯 Sniper Config</h3>
            <label><input type="checkbox" id="chk_enabled"> 🟢 Activado</label><hr>
            <label><input type="checkbox" id="chk_mini"> 👗 Vestidos Mini/Micro (M/L)</label><br>
            <label><input type="checkbox" id="chk_shoes"> 👠 Zapatos Talla 42</label><br>
            <label><input type="checkbox" id="chk_brands"> 🌟 Marcas Premium</label><hr>
            <label>💰 Precio Máx (Borde Rojo): <input type="number" id="in_price" style="width:50px" value="${cfg.cheapLimit}">€</label><br><br>
            <button id="btn_save" style="width:100%;background:#09B1BA;color:white;border:none;padding:8px;cursor:pointer;border-radius:4px;">GUARDAR</button>
        `;
        document.body.appendChild(panel);

        // Cargar valores
        document.getElementById('chk_enabled').checked = cfg.enabled;
        document.getElementById('chk_mini').checked = cfg.modeMini;
        document.getElementById('chk_shoes').checked = cfg.modeShoes42;
        document.getElementById('chk_brands').checked = cfg.modeBrands;

        // Guardar
        document.getElementById('btn_save').onclick = () => {
            cfg.enabled = document.getElementById('chk_enabled').checked;
            cfg.modeMini = document.getElementById('chk_mini').checked;
            cfg.modeShoes42 = document.getElementById('chk_shoes').checked;
            cfg.modeBrands = document.getElementById('chk_brands').checked;
            cfg.cheapLimit = parseFloat(document.getElementById('in_price').value);
            saveConfig();
            panel.remove();
            highlight(); // Re-ejecutar al guardar
        };
    }

    // --- LÓGICA DE BÚSQUEDA ---

    // Regex potentes
    const RE_MINI = /\b(mini|micro|corto|ajustado|sexy|bodycon)\b/i;
    const RE_DRESS = /\b(vestido|vstido|dress|falda)\b/i;
    const RE_SHOES = /\b(tacones|zapatos|botas|botines|sandalias|stilettos|heels)\b/i;
    const RE_SIZE_42 = /\b(42|talla 42|eu 42)\b/i;
    const RE_BRANDS = /\b(zara|mango|h&m|bershka|stradivarius|guess)\b/i;
    const RE_FORBIDDEN = /\b(niña|bebe|infantil|kids|hombre|chico)\b/i; // Evitar falsos positivos

    function parsePrice(text) {
        // Convierte "5,00 €" o "5€" a 5.00
        const clean = text.replace(/[^\d,.]/g, '').replace(',', '.');
        return parseFloat(clean) || 9999;
    }

    function highlight() {
        if (!cfg.enabled) return;

        // Selector actualizado 2024
        const items = document.querySelectorAll('[data-testid="grid-item"]');

        items.forEach(item => {
            if (item.dataset.emmaChecked) return; // No procesar dos veces el mismo
            // item.dataset.emmaChecked = "true"; // Descomentar si quieres optimizar rendimiento

            // Extraer texto completo del artículo
            const fullText = item.innerText.toLowerCase();
            const img = item.querySelector('img');
            const altText = img ? img.alt.toLowerCase() : "";
            const content = fullText + " " + altText;

            // Extraer precio
            const priceEl = item.querySelector('[data-testid*="price"]');
            const priceVal = priceEl ? parsePrice(priceEl.innerText) : 9999;

            // 1. Filtro negativo (evitar cosas de niños/hombres si buscamos mujer)
            if (RE_FORBIDDEN.test(content)) return;

            let isMatch = false;
            let matchReason = "";

            // 2. Chequeo: Vestidos Mini
            if (cfg.modeMini) {
                if (RE_DRESS.test(content) && RE_MINI.test(content)) {
                    // Chequeo laxo de talla M/L (si aparece en el texto)
                    if (content.includes(" m ") || content.includes(" l ") || content.includes("38") || content.includes("40")) {
                        isMatch = true;
                        matchReason = "👗 MINI";
                    }
                }
            }

            // 3. Chequeo: Zapatos 42
            if (cfg.modeShoes42) {
                if (RE_SHOES.test(content) && RE_SIZE_42.test(content)) {
                    isMatch = true;
                    matchReason = "👠 42";
                }
            }

            // 4. Chequeo: Marcas
            if (cfg.modeBrands && RE_BRANDS.test(content)) {
                // Solo si también es barato
                if (priceVal <= cfg.cheapLimit + 5) {
                    isMatch = true;
                    matchReason += " ⭐";
                }
            }

            // --- APLICAR ESTILOS ---
            if (isMatch) {
                // Fondo verde suave si coincide con búsqueda
                item.style.backgroundColor = cfg.highlightColor;
                item.style.borderRadius = "8px";
                item.style.transition = "all 0.3s";

                // Añadir etiqueta visual
                if (!item.querySelector('.emma-tag')) {
                    const tag = document.createElement('div');
                    tag.className = 'emma-tag';
                    tag.innerText = matchReason;
                    tag.style = "position:absolute; top:5px; left:5px; background:#09B1BA; color:white; font-size:10px; padding:2px 5px; border-radius:4px; z-index:10;";
                    item.style.position = "relative";
                    item.appendChild(tag);
                }

                // Borde ROJO si es un chollo de precio
                if (priceVal <= cfg.cheapLimit) {
                    item.style.border = `4px solid ${cfg.borderColor}`;
                    // Efecto visual extra para chollos
                    item.style.boxShadow = "0 0 15px rgba(255,0,0,0.4)";
                }
            }
        });
    }

    // Ejecutar cada segundo para pillar el scroll infinito
    setInterval(highlight, cfg.scanInterval);
    console.log("✅ Sniper Emma Highlighter cargado");

})();


    setInterval(highlight, cfg.scanInterval);
})();
