// ==UserScript==
// @name         Vinted MEGA-SNIPER PRO v34.0 - REAL SHIPPING (Precision Finance)
// @namespace    https://github.com/empcleon/vinted-megasniper-pro
// @version      34.0
// @description  Lee el coste de envío EXACTO de la ficha (detecta Gratis/Ofertas) para calcular el Precio Final Real.
// @author       Emma
// @match        https://www.vinted.es/*
// @match        https://www.vinted.fr/*
// @match        https://www.vinted.it/*
// @match        https://www.vinted.pl/*
// @match        https://www.vinted.be/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // =================================================================
    // 1. CONFIGURACIÓN & MATRICES
    // =================================================================
    const BRAND_TIERS = {
        TRASH: { regex: /\b(shein|primark|aliexpress|cider|temu|boohoo|kiabi|lefties|zeeman|action|atmosphere|tex|easy wear|florence|in extenso|clockhouse)\b/i, basePrice: 3, penalty: 100 },
        LOW: { regex: /\b(zara|bershka|stradivarius|pull[\W_]?&[\W_]?bear|h[\W_]?&[\W_]?m|mango|sfera|springfield|morgan|naf[\W_]?naf|etam|cache[\W_]?cache|pimkie|promod|inside|new yorker|only|vero moda|la boutique|most wanted|jennyfer|new look|parfois|tezenis)\b/i, basePrice: 12, penalty: 40 },
        MID: { regex: /\b(nike|adidas|levis|levi[\W_]?s|converse|vans|puma|diesel|guess|desigual|bimba[\W_]?y[\W_]?lola|massimo[\W_]?dutti|pepe[\W_]?jeans|tommy|calvin klein|porter|vila|kookai)\b/i, basePrice: 20, bonus: 10 },
        GOD: { regex: /\b(stussy|carhartt|north[\W_]?face|patagonia|arc[\W_]?teryx|stone[\W_]?island|dr[\W_]?martens|ralph[\W_]?lauren|lacoste|maje|sandro|sezane|zadig|ganni|reformation|diesel vintage)\b/i, basePrice: 45, bonus: 30 }
    };

    const CATEGORIES = {
        COAT: { regex: /\b(abrigo|chaqueta|cazadora|coat|manteau|veste|blouson|plumas|puffer|trench|gabardina|bomber|leather jacket|cuero)\b/i, multiplier: 3.0 },
        SHOES: { regex: /\b(zapatos|botas|botines|shoes|boots|bottes|bottines|zapatillas|sneakers|baskets|sandalias|sandales|heels|tacones)\b/i, multiplier: 2.0 },
        CORSET: { regex: /\b(corset|corsé|bustier|lencero|lenceria|bodysuit|body|top lencero)\b/i, multiplier: 1.5 },
        TOP: { regex: /\b(top|t-shirt|camiseta|camisa|shirt|chemise|crop|tank)\b/i, multiplier: 0.8 },
        STANDARD: { multiplier: 1.0 }
    };

    const VISUAL_DICT = {
        HOME: /\b(mirror|espejo|miroir|bedroom|chambre|habitaci[oó]n|door|puerta|porte|carpet|tapis|alfombra|curtain|cortina|indoor|interior|selfie)\b/i,
        STUDIO: /\b(studio|estudio|white background|fond blanc|fondo blanco|hanger|percha|cintre|clothing rack|mannequin|maniqui|isolated)\b/i,
        POSE: /\b(posing|posant|posando|standing|debout|de pie|human|humano|body|corps|cuerpo|waist|cintura|leg|pierna|jambe|thigh|muslo)\b/i,
        SEXY_ALT: /\b(cleavage|escote|decollete|open back|backless|dos nu|espalda|tight|ajustado|moulant|slim fit|short|mini|courte|slit|fente|apertura)\b/i,
        NIGHT: /\b(sparkling|brillante|glitter|sequin|lentejuela|party|fiesta|fete|evening|noche|soir|night)\b/i,
        WARM_LIGHT: /\b(warm|calida|yellow|amarilla|home light|luz casa|golden)\b/i,
        COLORS: /\b(red|rouge|rojo|pink|rose|rosa|fucsia|gold|or|dorado|silver|argent|plata)\b/i,
        LEGS: /\b(leg|legs|piernas?|jambes?|thigh|cuisse|knees|rodillas)\b/i
    };

    const defaultConfig = {
        enabled: true, minScore: 45, scanInterval: 800,
        modeMini: true, modeExtreme: false, modeTrends: true, modeLuxury: true,
        modeUrgent: true, modeGhosting: true, modeSizeL: true, modeHomeDetector: true, modeAntiStudio: true,
        apiUrl: "http://localhost:3000/api/sniper",
        colorLow: "#4caf50", colorMid: "#ff9800", colorHigh: "#f44336", colorExtreme: "#ff00de", colorTrend: "#9c27b0"
    };

    let cfg = { ...defaultConfig, ...GM_getValue("emmaConfig", {})};
    function saveConfig() { GM_setValue("emmaConfig", cfg); }

    // ========================================
    // 2. UTILIDADES
    // ========================================
    function parsePrice(str) { 
        if (!str) return 0;
        // Limpieza agresiva para obtener solo el número
        const cleanStr = str.replace(/[^0-9.,]/g, ''); 
        return parseFloat(cleanStr.replace(',', '.')) || 0; 
    }

    function extractSize(item) {
        const sizeAttr = item.querySelector('[data-testid*="size"], [itemprop="size"]');
        return sizeAttr ? sizeAttr.innerText.trim().toUpperCase() : "";
    }

    function getPriceSafely(context) {
        const priceEl = 
            context.querySelector("[data-testid='item-price']") ||
            context.querySelector(".item-price__price") ||
            context.querySelector("[itemprop='price']") ||
            context.querySelector(".price__value") ||
            context.querySelector("h3[class*='price']") || 
            null;
        if (!priceEl) return 0;
        return parsePrice(priceEl.innerText);
    }

    // 🔍 DETECTOR DE ENVÍO REAL
    function getRealShippingCost() {
        // Buscamos selectores donde Vinted muestra el envío
        const shippingElements = document.querySelectorAll("[data-testid*='shipping'], .item-shipping-methods__price, .shipping-option__price");
        
        let prices = [];
        let foundFree = false;

        shippingElements.forEach(el => {
            const text = el.innerText.toLowerCase();
            if (text.includes("gratis") || text.includes("gratuit") || text.includes("0,00") || text.includes("0.00")) {
                foundFree = true;
            } else {
                const p = parsePrice(text);
                if (p > 0) prices.push(p);
            }
        });

        if (foundFree) return 0;
        if (prices.length > 0) return Math.min(...prices); // Devolvemos el más barato
        
        return null; // No encontrado
    }

    // 🧮 CALCULADORA FINANCIERA INTELIGENTE
    function calculateTotalCost(itemPrice, packageSizeText) {
        // 1. Tasa Protección
        const protectionFee = 0.70 + (itemPrice * 0.05);
        
        // 2. Envío (Real o Estimado)
        let shippingCost = getRealShippingCost();

        if (shippingCost === null) {
            // Fallback: Estimación por tamaño si no vemos el envío real
            shippingCost = 3.79; 
            const sizeTxt = (packageSizeText || "").toLowerCase();
            if (sizeTxt.match(/media|moyen|medium/)) shippingCost = 4.99;
            if (sizeTxt.match(/grand|large/)) shippingCost = 6.99;
        }
        
        return (itemPrice + protectionFee + shippingCost).toFixed(2);
    }

    // ========================================
    // 3. MOTOR DE PUNTUACIÓN
    // ========================================
    function calculateScore(fullText, price, sizeData, imgElement, timeText = "") {
        let score = 50;
        let reasons = [];
        let isGhost = false;
        let isExtremeMatch = false;
        let sizeUpper = (sizeData || "").toUpperCase().trim();
        const text = fullText.toLowerCase().replace(/\s+/g, ' '); 

        // A. MARCA & CATEGORÍA
        let brandTier = "NONE";
        let baseLimit = 15;
        let penaltyVal = 0;
        let bonusVal = 0;

        if (BRAND_TIERS.TRASH.regex.test(text)) { brandTier = "TRASH"; baseLimit = 3; penaltyVal = 100; }
        else if (BRAND_TIERS.LOW.regex.test(text)) { brandTier = "LOW"; baseLimit = 12; penaltyVal = 40; }
        else if (BRAND_TIERS.MID.regex.test(text)) { brandTier = "MID"; baseLimit = 20; bonusVal = 10; }
        else if (BRAND_TIERS.GOD.regex.test(text)) { brandTier = "GOD"; baseLimit = 45; bonusVal = 30; }

        let catMult = 1.0;
        let catName = "";
        if (CATEGORIES.COAT.regex.test(text)) { catMult = 3.0; catName = "ABRIGO"; }
        else if (CATEGORIES.SHOES.regex.test(text)) { catMult = 2.0; catName = "ZAPATO"; }
        else if (CATEGORIES.CORSET.regex.test(text)) { catMult = 1.5; catName = "CORSET"; }
        else if (CATEGORIES.TOP.regex.test(text)) { catMult = 0.8; catName = "TOP"; }

        let matBonus = 0;
        if (/\b(lana|seda|cuero|piel|wool|silk|leather)\b/i.test(text)) { matBonus = 10; reasons.push("💎MAT"); }
        
        let dynamicLimit = (baseLimit * catMult) + matBonus;

        // B. ESTADO
        const isNew = /\b(nuevo|etiqueta|neuf|bnwt)\b/i.test(text);
        if (isNew) { dynamicLimit = dynamicLimit * 1.3; score += 15; reasons.push("🏷️NUEVO"); }
        else if ((brandTier === "TRASH" || brandTier === "LOW") && !isNew) {
            dynamicLimit = dynamicLimit * 0.85; 
        }

        // C. VISUAL
        let isHomePhoto = false;
        let isSexyAlt = false;
        
        if (imgElement) {
            try {
                const alt = (imgElement.alt || "").toLowerCase();
                const h = imgElement.naturalHeight || 0;
                const w = imgElement.naturalWidth || 0;
                const ratio = (h && w) ? h / w : 0;

                if (VISUAL_DICT.POSE.test(alt)) { score += 20; reasons.push("📸POSE"); }
                if (VISUAL_DICT.LEGS.test(alt)) { score += 15; reasons.push("🦵LEGS"); }
                if (VISUAL_DICT.HOME.test(alt)) { score += 15; reasons.push("🏠CASA"); isHomePhoto = true; }
                if (VISUAL_DICT.SEXY_ALT.test(alt)) { score += 25; reasons.push("🔥AI-SEXY"); isSexyAlt = true; }
                if (VISUAL_DICT.COLORS.test(alt)) { score += 10; reasons.push("🎨COLOR"); }
                
                if (ratio > 0.70 && ratio < 1.40 && (alt.includes("mini") || alt.includes("short") || text.includes("mini"))) {
                    score += 15; reasons.push("📏MINI-REAL"); 
                }
                if (cfg.modeAntiStudio && VISUAL_DICT.STUDIO.test(alt)) {
                    score -= 50; reasons.push("⛔CATALOGO"); isGhost = true;
                }
            } catch(e){}
        }

        // D. PRECIO
        if (brandTier !== "NONE") {
            score += bonusVal;
            if (brandTier === "GOD") { reasons.push("💎TIER-S"); isExtremeMatch = true; }
            
            if (price > dynamicLimit) {
                score -= 30;
                if (brandTier === "TRASH" || brandTier === "LOW") { 
                    score -= penaltyVal; reasons.push(`💸CARO`); isGhost = true; 
                } else { 
                    reasons.push("💸ALTO"); 
                }
            } else {
                if (price <= dynamicLimit * 0.5) { score += 20; reasons.push("🦄GANGA"); }
                else { score += 5; reasons.push("✅PRECIO"); }
            }
        }

        // E. EXTRAS
        const reSexy = /\b(mini|micro|ajustado|bodycon|sexy|escote|espalda|cut[- ]?out)\b/i;
        const isL = /\b(L|40|42)\b/i.test(sizeUpper);

        if (reSexy.test(text) || catName === "CORSET") { score += 10; reasons.push("🔥TXT-SEXY"); }
        
        if (cfg.modeSizeL && isL) {
            score += 15; reasons.push("🍑CURVY-L");
            if (isSexyAlt || reSexy.test(text) || reasons.includes("📸POSE")) {
                score += 25; reasons.push("💥CURVY-PLUS"); isExtremeMatch = true;
            }
        }

        if (/\b(min|minutos|seg|segundos|ahora|instant|now)\b/i.test(timeText)) {
            score += 20; reasons.push("⚡FRESH"); isExtremeMatch = true;
        }

        if (price < 5 && price > 0 && !isGhost) { score += 10; reasons.push("💰<5€"); }

        if (cfg.modeGhosting && isGhost) {
            if (isHomePhoto && (isSexyAlt || reasons.includes("📸POSE")) && price < 10) {
                return { score: 65, reasons: ["⚠️HIDDEN-GEM", ...reasons], isGhost: false };
            }
            return { score: 0, reasons, isGhost: true };
        }

        return { score: Math.min(Math.max(score, 0), 100), reasons, isGhost, isExtremeMatch };
    }

    // ========================================
    // 4. CONEXIÓN APP
    // ========================================
    function sendToApp(data, btn) {
        btn.innerText = "⏳...";
        GM_xmlhttpRequest({
            method: "POST", url: cfg.apiUrl, headers: { "Content-Type": "application/json" }, data: JSON.stringify(data),
            onload: function(response) {
                if (response.status >= 200 && response.status < 300) { btn.innerText = "✅"; btn.style.background = "#4caf50"; } 
                else { btn.innerText = "❌"; }
                setTimeout(() => btn.innerText = "🤖", 3000);
            },
            onerror: function(err) { btn.innerText = "🔌"; alert("App desconectada."); }
        });
    }

    // ========================================
    // 5. MODO CATÁLOGO
    // ========================================
    const emmaCache = new Set();
    function runGridMode() {
        const items = document.querySelectorAll('[data-testid="grid-item"]');
        items.forEach(item => {
            try {
                const link = item.querySelector('a');
                if (!link) return;
                const itemId = link.href;
                if (emmaCache.has(itemId)) return;
                emmaCache.add(itemId);

                if (GM_getValue("hidden_" + itemId, false)) { item.style.display = "none"; return; }

                let rawText = item.innerText.toLowerCase();
                rawText = rawText.replace(/incluye protección.*/g, "").replace(/[0-9]+[.,][0-9]+ ?€/g, ""); 
                
                const img = item.querySelector('img');
                const fullText = rawText + " " + (img?.alt?.toLowerCase() || "");
                const price = getPriceSafely(item); 
                const sizeData = extractSize(item);
                const imgSrc = img?.src || "";
                const timeText = item.innerText; 

                if (/\b(niña|niño|bebe|infantil|kids)\b/i.test(fullText) && !fullText.includes("vest")) return;

                const { score, reasons, isGhost, isExtremeMatch } = calculateScore(fullText, price, sizeData, img, timeText);

                if (isGhost) { item.style.opacity = "0.2"; item.style.filter = "grayscale(100%)"; item.style.pointerEvents = "none"; return; }
                if (score < cfg.minScore) return;

                let borderColor = isExtremeMatch || score >= 90 ? cfg.colorExtreme : "transparent";
                let bg = score >= 70 ? cfg.colorMid : cfg.colorLow;
                if (isExtremeMatch) bg = cfg.colorExtreme;
                if (reasons.includes("⚡FRESH")) borderColor = "#00ff00";

                item.style.background = `linear-gradient(135deg, ${bg}15 0%, #ffffff00 90%)`;
                item.style.border = `2px solid ${borderColor}`;
                item.style.borderRadius = "10px";
                item.style.position = "relative";

                if (!item.querySelector('.emma-score')) {
                    const b = document.createElement("div"); b.className = "emma-score"; b.innerText = score;
                    b.style = `position:absolute;top:6px;right:6px;background:#000a;color:white;padding:4px 8px;border-radius:8px;font-size:12px;font-weight:bold;z-index:10;`;
                    item.appendChild(b);
                }
                if (!item.querySelector('.emma-tags') && reasons.length > 0) {
                    const t = document.createElement("div"); t.className = "emma-tags"; t.innerText = reasons.join(" ");
                    t.style = `position:absolute;bottom:6px;left:6px;background:rgba(0,0,0,0.8);color:white;padding:2px 5px;border-radius:6px;font-size:10px;max-width:80%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;z-index:10;`;
                    item.appendChild(t);
                }
                if (!item.querySelector('.emma-ai-btn')) {
                    const aiBtn = document.createElement("button"); aiBtn.className = "emma-ai-btn"; aiBtn.innerText = "🤖";
                    aiBtn.style = `position:absolute; bottom:6px; right:45px; background:#673ab7; color:white; border:none; padding:4px 8px; cursor:pointer; border-radius:6px; font-size:12px; z-index:20;`;
                    aiBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); sendToApp({ url: itemId, price, title: fullText, score, img: imgSrc, size: sizeData, reasons }, aiBtn); };
                    item.appendChild(aiBtn);
                }
                if (!item.querySelector('.emma-hide')) {
                    const hideBtn = document.createElement("button"); hideBtn.className = "emma-hide"; hideBtn.innerText = "❌";
                    hideBtn.style = `position:absolute;top:6px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.6);color:white;border:none;padding:2px 6px;cursor:pointer;border-radius:4px;font-size:10px;z-index:20;`;
                    hideBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); item.style.display = "none"; GM_setValue("hidden_" + itemId, true); };
                    item.appendChild(hideBtn);
                }
            } catch(e) { console.error("Grid Error", e); }
        });
    }

    // ========================================
    // 6. MODO FORENSE (FICHA)
    // ========================================
    let forensicAnalyzed = false;

    function runForensicMode() {
        if (forensicAnalyzed) return;
        
        const titleEl = document.querySelector("[property='og:title']");
        const mainImg = document.querySelector(".item-photo--1 img") || document.querySelector("[data-testid='item-photo'] img");
        const price = getPriceSafely(document);

        if (!titleEl || !mainImg) return;

        forensicAnalyzed = true;

        let jsonData = {};
        try {
            const scripts = document.querySelectorAll('script[type="application/ld+json"]');
            for (let s of scripts) {
                const j = JSON.parse(s.innerText);
                if (j['@type'] === 'Product') { jsonData = j; break; }
            }
        } catch(e){}

        const title = titleEl.content || "";
        const desc = document.querySelector("[data-testid='item-description']")?.innerText || jsonData.description || "";
        const imgSrc = mainImg.src || "";
        
        let brand = jsonData.brand?.name || "";
        let size = "", status = "", color = jsonData.color || "";
        let packageSize = "Mediano (Est.)";

        document.querySelectorAll(".details-list__item").forEach(row => {
            const label = row.querySelector(".details-list__item-title")?.innerText.toLowerCase() || "";
            const value = row.querySelector(".details-list__item-value")?.innerText || "";
            if (!brand && (label.match(/marca|marque|brand/))) brand = value;
            if (label.match(/talla|taille|size/)) size = value;
            if (label.match(/estado|état|condition/)) status = value;
            if (label.match(/tamaño del paquete|format du colis/)) packageSize = value;
        });

        const fullText = `${title} ${desc} ${brand} ${size} ${status} ${color}`.toLowerCase();
        const { score, reasons, isExtremeMatch } = calculateScore(fullText, price, size, mainImg);

        const totalCost = calculateTotalCost(price, packageSize);

        renderForensicPanel(score, reasons, isExtremeMatch, price, totalCost, brand, {
            url: window.location.href, price, title: fullText, score, img: imgSrc, size, reasons
        });
    }

    function renderForensicPanel(score, reasons, isExtreme, price, totalCost, brand, itemData) {
        if (document.getElementById("emma-forensic-panel")) return;

        const panel = document.createElement("div");
        panel.id = "emma-forensic-panel";
        let color = score >= 85 ? cfg.colorHigh : (score >= 50 ? cfg.colorMid : cfg.colorLow);
        if (isExtreme) color = cfg.colorExtreme;

        panel.innerHTML = `
            <div style="font-family:Arial; color:white;">
                <h2 style="margin:0 0 10px 0; text-align:center; color:${color}; text-shadow: 0 0 10px ${color};">🕵️‍♀️ ANÁLISIS V34</h2>
                
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                    <div style="font-size:36px; font-weight:bold; color:${color};">${score}</div>
                    <div style="text-align:right;">
                        <div style="font-size:12px; color:#aaa;">${brand || "Marca?"}</div>
                        <div style="font-size:20px; font-weight:bold;">${price}€</div>
                    </div>
                </div>

                <div style="background:#222; padding:8px; border-radius:6px; margin-bottom:10px; border:1px solid #444;">
                    <div style="font-size:11px; color:#aaa; text-align:center;">PRECIO TOTAL (aprox)</div>
                    <div style="font-size:16px; font-weight:bold; text-align:center; color:${totalCost > 15 ? '#ff5252' : '#69f0ae'};">
                        ${totalCost}€
                    </div>
                </div>

                <div style="background:#333; padding:10px; border-radius:8px; margin-bottom:10px;">
                    ${reasons.map(r => `<span style="display:inline-block; background:#000; color:#fff; padding:3px 6px; margin:2px; border-radius:4px; font-size:11px; border:1px solid #555;">${r}</span>`).join("")}
                </div>

                <button id="forensic-btn" style="width:100%; background:#673ab7; color:white; border:none; padding:10px; cursor:pointer; border-radius:6px; font-weight:bold; margin-bottom:10px;">
                    🤖 ENVIAR A APP
                </button>
                <button id="emma-close-forensic" style="width:100%; background:#444; color:white; border:none; padding:8px; cursor:pointer; border-radius:6px;">Cerrar Panel</button>
            </div>
        `;

        panel.style = `position: fixed; top: 100px; right: 20px; width: 280px; background: rgba(0,0,0,0.9); padding: 20px; border-radius: 12px; border: 2px solid ${color}; z-index: 999999;`;
        document.body.appendChild(panel);
        
        document.getElementById('forensic-btn').onclick = (e) => { sendToApp(itemData, e.target); };
        document.getElementById('emma-close-forensic').onclick = () => panel.remove();
    }

    // ========================================
    // 7. CONFIG
    // ========================================
    function createFloatingBtn() {
        if (document.getElementById('emma-float-btn')) return;
        const btn = document.createElement("button");
        btn.id = 'emma-float-btn'; btn.innerText = "⚙️";
        btn.style = `position: fixed; bottom: 20px; right: 20px; width: 50px; height: 50px; background: #09B1BA; color: white; border-radius: 50%; border: none; box-shadow: 0 4px 10px rgba(0,0,0,0.3); font-size: 24px; cursor: pointer; z-index: 999999;`;
        btn.onclick = openConfig;
        document.body.appendChild(btn);
    }

    function openConfig() {
        if (document.querySelector("#emma-panel")) return;
        const p = document.createElement("div"); p.id = "emma-panel";
        p.style = "position:fixed;top:10px;right:10px;width:340px;background:#fff;padding:20px;border:3px solid #09B1BA;z-index:999999;border-radius:10px;max-height:90vh;overflow-y:auto;";
        p.innerHTML = `
            <h3 style="margin:0 0 12px 0;color:#09B1BA;text-align:center;">🎯 V34.0 REAL SHIPPING</h3>
            <label><input type="checkbox" id="c_en"> 🟢 Activar</label><br><br>
            <div style="background:#eee;padding:10px;border-radius:6px;margin-bottom:10px;">
                <strong>💰 Cálculo Real:</strong><br>
                Detecta Envío Gratis o Precio Exacto.<br>
            </div>
            <label><input type="checkbox" id="c_home"> 🏠 Detector Casa</label><br>
            <label><input type="checkbox" id="c_studio"> 🚫 Anti-Catálogo</label><br>
            <label><input type="checkbox" id="c_mini"> 👗 Vestidos & Sexy</label><br>
            <label><input type="checkbox" id="c_sizeL"> 🍑 <b>Curvy+ (L)</b></label><br>
            <label><input type="checkbox" id="c_extreme"> 🔥 Modo Extreme</label><br>
            <label><input type="checkbox" id="c_trends"> ✨ Tendencias</label><br>
            <label><input type="checkbox" id="c_luxury"> 💎 Lujo</label><br>
            <label><input type="checkbox" id="c_ghost"> 👻 Ocultar Sobreprecio</label><br>
            <label>🔌 App URL:</label><br>
            <input type="text" id="c_api" value="${cfg.apiUrl}" style="width:100%;border:1px solid #ccc;"><br><br>
            <div style="text-align:center;">
                <button id="b_save" style="background:#09B1BA;color:white;border:none;padding:8px 20px;border-radius:6px;cursor:pointer;">GUARDAR</button>
                <button id="b_close" style="background:#ccc;border:none;padding:8px 10px;border-radius:6px;margin-left:5px;cursor:pointer;">Cerrar</button>
            </div>
        `;
        document.body.appendChild(p);

        document.getElementById('c_en').checked = cfg.enabled;
        document.getElementById('c_mini').checked = cfg.modeMini;
        document.getElementById('c_sizeL').checked = cfg.modeSizeL;
        document.getElementById('c_extreme').checked = cfg.modeExtreme;
        document.getElementById('c_trends').checked = cfg.modeTrends;
        document.getElementById('c_luxury').checked = cfg.modeLuxury;
        document.getElementById('c_ghost').checked = cfg.modeGhosting;
        document.getElementById('c_home').checked = cfg.modeHomeDetector;
        document.getElementById('c_studio').checked = cfg.modeAntiStudio;
        document.getElementById('c_api').value = cfg.apiUrl;

        document.getElementById('b_save').onclick = () => {
            cfg.enabled = document.getElementById('c_en').checked;
            cfg.modeMini = document.getElementById('c_mini').checked;
            cfg.modeSizeL = document.getElementById('c_sizeL').checked;
            cfg.modeExtreme = document.getElementById('c_extreme').checked;
            cfg.modeTrends = document.getElementById('c_trends').checked;
            cfg.modeLuxury = document.getElementById('c_luxury').checked;
            cfg.modeGhosting = document.getElementById('c_ghost').checked;
            cfg.modeHomeDetector = document.getElementById('c_home').checked;
            cfg.modeAntiStudio = document.getElementById('c_studio').checked;
            cfg.apiUrl = document.getElementById('c_api').value;
            saveConfig();
            alert("✅ Configuración guardada");
            p.remove();
        };
        document.getElementById('b_close').onclick = () => p.remove();
    }

    // ========================================
    // 8. LOOP MAESTRO
    // ========================================
    let currentPath = window.location.pathname;
    
    function masterLoop() {
        if (!cfg.enabled) return;
        createFloatingBtn();

        if (window.location.pathname !== currentPath) {
            currentPath = window.location.pathname;
            forensicAnalyzed = false;
            const oldPanel = document.getElementById("emma-forensic-panel");
            if(oldPanel) oldPanel.remove();
        }

        if (window.location.href.includes("/items/")) {
            runForensicMode();
        } else {
            runGridMode();
        }
    }

    setInterval(masterLoop, 1000);
    console.log("✅ V34.0 REAL SHIPPING - READY");

})();    GM_registerMenuCommand("🗑️ Restaurar ocultos", clearHidden);

    // ========================================
    // UTILIDADES
    // ========================================
    function parsePrice(str) { return parseFloat(str.replace(/[^\d,.]/g, '').replace(',', '.')) || 999; }

    function extractSize(item) {
        const sizeAttr = item.querySelector('[data-testid*="size"], [itemprop="size"]');
        if (sizeAttr) return sizeAttr.innerText.trim().toUpperCase();
        const subtitle = item.querySelector('[data-testid*="description-subtitle"]');
        if (subtitle) return subtitle.innerText.trim().toUpperCase();
        const img = item.querySelector('img');
        if (img?.alt) {
            const match = img.alt.match(/tama[ñn]o[:\s]*([\w\s\/]+)/i);
            if (match) return match[1].toUpperCase();
        }
        return "";
    }

    function clearHidden() {
        if (confirm('¿Restaurar ocultos?')) {
            const keys = GM_listValues();
            keys.forEach(key => { if (key.startsWith('hidden_')) GM_deleteValue(key); });
            alert('✅ Restaurados. Recarga la web.');
        }
    }

    function showStats() {
        alert(`📊 HOY: ${stats.count} chollos | Total: ${stats.total.toFixed(2)}€ | Mejor Score: ${stats.best}`);
    }

    // ========================================
    // MOTOR SCORING FASHION (v18)
    // ========================================
    function calculateScore(item, text, fullText, price, sizeData) {
        let score = 50;
        let reasons = [];
        let isGhost = false;
        let isExtremeMatch = false;
        let isTrendMatch = false;
        let sizeUpper = sizeData.toUpperCase().trim();

        if (sizeUpper.length > 10) {
            const m = sizeUpper.match(/\b(XXS|XS|S|M|L|XL|XXL|32|34|36|38|40|42)\b/);
            if (m) sizeUpper = m[1];
        }

        const reSexy = /\b(mini|micro|ajustado|ceñido|entallado|pegado|sexy|bodycon|tubo|lápiz|escotazo|escote|pico|coraz[oó]n|bardot|palabra de honor|strapless|espalda (abierta|descubierta|aire)|lentejuelas|brillo|terciopelo|velvet|sat[ée]n|satin|encaje|transparencia|transparente|cut[- ]?out|abertura|raja)\b/i;
        const reDress = /\b(vestido|vestidito|vestidazo|vestidin|dress|slip dress|fiesta|cocktail|evening)\b/i;
        const reTrends = /\b(y2k|2000s|00s|vintage|retro|grunge|fairy|cyber|corset|corsé|bustier|cargo|parachute|top)\b/i;
        const reLuxury = /\b(cuero|piel|leather|ante|serraje|seda|silk|lana|wool|cachemir|cashmere|plata|silver|925|oro|gold|18k|perlas?)\b/i;
        const reNew = /\b(con etiqueta|etiqueta|neuf|new|nuevo|sin estrenar|bnwt)\b/i;
        const brandsC = /\b(shein|primark|aliexpress|boohoo|kiabi|c[\W_]?&[\W_]?a|shana|mulaya|marypaz|shien|lefties)\b/i;

        // 1. EXTREME SEXY
        if (reSexy.test(fullText)) {
            score += 15; reasons.push("🔥SEXY");
            if (reDress.test(fullText) || fullText.includes("mini") || fullText.includes("micro")) {
                score += 15; isExtremeMatch = true;
            }
        }

        // 2. TENDENCIAS
        if (cfg.modeTrends && reTrends.test(fullText)) {
            score += 15; reasons.push("✨TREND");
            isTrendMatch = true;
            if (reSexy.test(fullText)) { score += 10; reasons.push("🦄SUPER-HIT"); isExtremeMatch = true; }
        }

        // 3. LUJO
        if (cfg.modeLuxury && reLuxury.test(fullText)) {
            score += 15; reasons.push("💎MAT");
            if (reSexy.test(fullText)) { score += 10; reasons.push("💣BOMBA"); isExtremeMatch = true; }
        }

        // 4. NUEVO
        if (reNew.test(fullText)) {
            score += 10; reasons.push("🏷️NUEVO");
            if (price < 10) { score += 10; reasons.push("🎁REGALO"); }
        }

        // 5. GHOSTING
        if (cfg.modeGhosting) {
            const cheapBrand = brandsC.test(fullText);
            if (cheapBrand) {
                if (reSexy.test(fullText) || reTrends.test(fullText) || reLuxury.test(fullText)) {
                    score -= 10; reasons.push("⚠️LOW-COST");
                } else {
                    return { score: 0, reasons, isGhost: true };
                }
            }
        }

        // 6. MODO EXTREME
        if (cfg.modeExtreme && !isExtremeMatch && !isTrendMatch) { return { score: 0, reasons, isGhost: true }; }

        // 7. PRECIOS/URGENCIAS/ZAPATOS
        if (price < 5) { score += 10; reasons.push("💰<5€"); } else if (price < 10) { score += 5; }
        if (cfg.modeUrgent && /\b(urge|urgente|mudanza|liquidaci[oó]n)\b/i.test(fullText)) { score += 20; reasons.push("🆘URGENTE"); }
        if (fullText.includes("vest") || fullText.includes("dress")) { score += 5; }
        if (/\b(tacones|zapatos|botas)\b/i.test(fullText) && sizeUpper.includes('42')) { score += 20; reasons.push("👠42"); }

        return { score: Math.min(Math.max(score, 0), 100), reasons, isGhost: false, isExtremeMatch, isTrendMatch };
    }

    // ========================================
    // CONEXIÓN CON APP (EL PUENTE)
    // ========================================
    function sendToApp(data, btn) {
        btn.innerText = "⏳";

        GM_xmlhttpRequest({
            method: "POST",
            url: cfg.apiUrl,
            headers: { "Content-Type": "application/json" },
            data: JSON.stringify(data),
            onload: function(response) {
                if (response.status >= 200 && response.status < 300) {
                    btn.innerText = "✅"; // Éxito
                    btn.style.background = "#4caf50";
                } else {
                    btn.innerText = "❌"; // Error Servidor
                    console.error("Error App:", response);
                    alert("Error enviando a App: " + response.status);
                }
                setTimeout(() => btn.innerText = "🤖", 3000); // Reset visual
            },
            onerror: function(err) {
                btn.innerText = "🔌"; // Error Conexión (App apagada)
                alert("No se puede conectar con la App. ¿Está encendida?");
            }
        });
    }

    // ========================================
    // VISUALES
    // ========================================
    function highlight() {
        if (!cfg.enabled) return;

        const items = document.querySelectorAll('[data-testid="grid-item"]');
        items.forEach(item => {
            const link = item.querySelector('a');
            if (!link) return;

            const itemId = link.href;
            item.dataset.itemId = itemId;
            if (emmaCache.has(itemId)) return;
            emmaCache.add(itemId);

            if (GM_getValue("hidden_" + itemId, false)) { item.style.display = "none"; return; }

            const text = item.innerText.toLowerCase();
            const img = item.querySelector('img');
            const imgAlt = img?.alt?.toLowerCase() || "";
            const imgSrc = img?.src || "";
            const fullText = text + " " + imgAlt;

            if (/\b(niña|niño|bebe|infantil|kids)\b/i.test(fullText) && !fullText.includes("vest") && !fullText.includes("top") && !fullText.includes("y2k")) return;

            const sizeData = extractSize(item);
            const priceNode = item.querySelector('[data-testid*="price"]');
            const price = priceNode ? parsePrice(priceNode.innerText) : 999;

            const { score, reasons, isGhost, isExtremeMatch, isTrendMatch } = calculateScore(item, text, fullText, price, sizeData);

            if (isGhost) {
                item.style.opacity = "0.2";
                item.style.filter = "grayscale(100%)";
                item.style.pointerEvents = "none";
                return;
            }

            if (score < cfg.minScore) return;
            addToStats(score, price);

            let bg = cfg.colorLow;
            let borderColor = "transparent";
            let shadow = "0 4px 14px rgba(0,0,0,0.12)";

            if (score >= 70) bg = cfg.colorMid;
            if (score >= 85) bg = cfg.colorHigh;

            if (isExtremeMatch || score >= 90) {
                borderColor = cfg.colorExtreme;
                shadow = `0 0 15px ${cfg.colorExtreme}88`;
                bg = cfg.colorExtreme;
            } else if (isTrendMatch) {
                borderColor = cfg.colorTrend;
                shadow = `0 0 10px ${cfg.colorTrend}66`;
                bg = cfg.colorTrend;
            }

            item.style.background = `linear-gradient(135deg, ${bg}15 0%, #ffffff00 90%)`;
            item.style.border = `2px solid ${borderColor}`;
            item.style.boxShadow = shadow;
            item.style.borderRadius = "10px";
            item.style.transition = "all .25s ease";
            item.style.position = "relative";

            // BOTÓN CERRAR
            if (!item.querySelector('.emma-hide')) {
                const hideBtn = document.createElement("button");
                hideBtn.className = "emma-hide";
                hideBtn.innerText = "❌";
                hideBtn.style = `position:absolute;top:6px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.6);color:white;border:none;padding:2px 6px;cursor:pointer;border-radius:4px;font-size:10px;z-index:20;`;
                hideBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); item.style.display = "none"; GM_setValue("hidden_" + itemId, true); };
                item.appendChild(hideBtn);
            }

            // 🚀 BOTÓN IA (ENVIAR A APP)
            if (!item.querySelector('.emma-ai-btn')) {
                const aiBtn = document.createElement("button");
                aiBtn.className = "emma-ai-btn";
                aiBtn.innerText = "🤖";
                aiBtn.title = "Enviar a Análisis IA";
                aiBtn.style = `position:absolute; bottom:6px; right:45px; background:#673ab7; color:white; border:none; padding:4px 8px; cursor:pointer; border-radius:6px; font-size:12px; z-index:20; box-shadow: 0 2px 5px rgba(0,0,0,0.3); transition: transform 0.1s;`;

                aiBtn.onclick = (e) => {
                    e.preventDefault(); e.stopPropagation();
                    const itemData = {
                        url: itemId,
                        price: price,
                        title: fullText,
                        score: score,
                        img: imgSrc,
                        size: sizeData,
                        reasons: reasons
                    };
                    sendToApp(itemData, aiBtn);
                };
                item.appendChild(aiBtn);
            }

            // Badge SCORE
            if (!item.querySelector('.emma-score')) {
                const b = document.createElement("div");
                b.className = "emma-score";
                b.textContent = score;
                let badgeBg = isExtremeMatch ? cfg.colorExtreme : (isTrendMatch ? cfg.colorTrend : "#000a");
                b.style = `position:absolute;top:6px;right:6px;background:${badgeBg};backdrop-filter:blur(4px);color:white;padding:6px 8px;border-radius:8px;font-size:12px;font-weight:bold;z-index:10;box-shadow:0 2px 5px rgba(0,0,0,0.3);`;
                item.appendChild(b);
            }

            // Etiquetas
            if (!item.querySelector('.emma-tags') && reasons.length > 0) {
                const t = document.createElement("div");
                t.className = "emma-tags";
                t.textContent = reasons.join(" ");
                t.style = `position:absolute;bottom:6px;left:6px;background:rgba(0,0,0,0.8);color:white;padding:3px 6px;border-radius:6px;font-size:10px;max-width:70%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;z-index:10;`;
                item.appendChild(t);
            }

            // Precio
            if (price < 10 && !item.querySelector('.emma-price')) {
                const p = document.createElement("div");
                p.className = "emma-price";
                p.textContent = `💥 ${price}€`;
                p.style = `position:absolute;bottom:6px;right:6px;background:${cfg.colorHigh};color:white;padding:4px 8px;border-radius:6px;font-size:12px;font-weight:bold;z-index:10;`;
                item.appendChild(p);
            }

            if (cfg.modeSound && (isExtremeMatch || score >= 80) && !item.dataset.soundPlayed) {
                ALERT_SOUND.play().catch(()=>{});
                item.dataset.soundPlayed = "1";
            }
        });
    }

    function openConfig() {
        if (document.querySelector("#emma-panel")) return;
        const p = document.createElement("div");
        p.id = "emma-panel";
        p.style = "position:fixed;top:10px;right:10px;width:360px;background:#fff;padding:20px;border:3px solid #09B1BA;z-index:999999;box-shadow:0 0 30px rgba(0,0,0,0.5);font-family:Arial;border-radius:10px;max-height:90vh;overflow-y:auto;";
        p.innerHTML = `
            <h3 style="margin:0 0 12px 0;color:#09B1BA;text-align:center;">🎯 HUD v18.1 (Hybrid)</h3>
            <label><input type="checkbox" id="c_en"> 🟢 Activar</label><br><br>

            <div style="background:#ff00de11;padding:8px;border-radius:6px;border:1px solid #ff00de;">
                <label><input type="checkbox" id="c_mini"> 👗 Vestidos & Sexy Style</label><br>
                <label><input type="checkbox" id="c_extreme"> 🔥 <b>MODO EXTREME</b></label>
            </div><br>

            <div style="background:#9c27b011;padding:8px;border-radius:6px;border:1px solid #9c27b0;">
                <label><input type="checkbox" id="c_trends"> ✨ Tendencias (Y2K)</label><br>
                <label><input type="checkbox" id="c_luxury"> 💎 Lujo & Materiales</label>
            </div><br>

            <label>🔌 App URL (Conexión IA):</label><br>
            <input type="text" id="c_api" value="${cfg.apiUrl}" style="width:100%;margin-bottom:10px;border:1px solid #ccc;padding:4px;"><br>

            <label><input type="checkbox" id="c_ghost"> 👻 Ghosting Shein</label><br>
            <label>🎯 Score mín: <input type="number" id="c_score" value="${cfg.minScore}" style="width:50px;"></label>

            <div style="margin-top:15px;text-align:center;">
                <button id="b_save" style="background:#09B1BA;color:white;border:none;padding:8px 20px;border-radius:6px;cursor:pointer;">GUARDAR</button>
                <button id="b_close" style="background:#ccc;border:none;padding:8px 20px;border-radius:6px;cursor:pointer;margin-left:10px;">Cerrar</button>
            </div>
        `;
        document.body.appendChild(p);

        document.getElementById('c_en').checked = cfg.enabled;
        document.getElementById('c_mini').checked = cfg.modeMini;
        document.getElementById('c_extreme').checked = cfg.modeExtreme;
        document.getElementById('c_trends').checked = cfg.modeTrends;
        document.getElementById('c_luxury').checked = cfg.modeLuxury;
        document.getElementById('c_ghost').checked = cfg.modeGhosting;
        document.getElementById('c_score').value = cfg.minScore;
        document.getElementById('c_api').value = cfg.apiUrl;

        document.getElementById('b_save').onclick = () => {
            cfg.enabled = document.getElementById('c_en').checked;
            cfg.modeMini = document.getElementById('c_mini').checked;
            cfg.modeExtreme = document.getElementById('c_extreme').checked;
            cfg.modeTrends = document.getElementById('c_trends').checked;
            cfg.modeLuxury = document.getElementById('c_luxury').checked;
            cfg.modeGhosting = document.getElementById('c_ghost').checked;
            cfg.minScore = Number(document.getElementById('c_score').value) || 45;
            cfg.apiUrl = document.getElementById('c_api').value;
            saveConfig();
            alert("✅ Configuración guardada");
            p.remove();
            emmaCache.clear();
        };
        document.getElementById('b_close').onclick = () => p.remove();
    }

    setInterval(highlight, cfg.scanInterval);
    console.log("✅ V18.1 HYBRID - APP BRIDGE ACTIVE");
})();


    setInterval(highlight, cfg.scanInterval);
})();
