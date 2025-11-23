// ==UserScript==
// @name         Vinted MEGA-SNIPER PRO v18.1 AISTUDIO- HYBRID (Script + App Conector)
// @namespace    https://github.com/empcleon/vinted-megasniper-pro
// @version      18.1
// @description  El puente perfecto: Detecta visualmente y envía a tu App con un clic para análisis IA.
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

    const defaultConfig = {
        enabled: true,
        minScore: 45,
        scanInterval: 800,
        modeMini: true,
        modeExtreme: false,
        modeTrends: true,
        modeLuxury: true,
        modeUrgent: true,
        modeGhosting: true,
        modeSound: true,
        apiUrl: "http://localhost:3000/api/sniper", // 🔌 TU APP AQUÍ
        colorLow: "#4caf50",
        colorMid: "#ff9800",
        colorHigh: "#f44336",
        colorExtreme: "#ff00de",
        colorTrend: "#9c27b0"
    };

    const cfg = {...defaultConfig, ...GM_getValue("emmaConfig", {})};
    function saveConfig() { GM_setValue("emmaConfig", cfg); }

    // --- ESTADÍSTICAS ---
    function getToday() { return new Date().toISOString().split('T')[0]; }
    let stats = GM_getValue("dailyStatsV18", {date: getToday(), count: 0, total: 0, best: 0});
    if (stats.date !== getToday()) { stats = {date: getToday(), count: 0, total: 0, best: 0}; GM_setValue("dailyStatsV18", stats); }

    function addToStats(score, price) {
        stats.count++;
        stats.total += price;
        if (score > stats.best) stats.best = score;
        GM_setValue("dailyStatsV18", stats);
    }

    const ALERT_SOUND = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSA0PVqzn77BdGAg+ltryxnMpBSp+zPLaizsIGGS57OihUBELTKXh8bllHAU2jdXzzn0vBSV1xe/gmEgNDlOo5O+zYBoGPJPY8shaKwcpfsrz3I4+CRdiu+PqnlYRCkin4/S4aiEEMIjU8tGAMgYebMPv45ZLDAxSqOPus2MaByJ90O/eizYHHmfA7+OYSwwMUKXi8LJlGwQ3jdT0z3wwBSp9y/LajDkIGGO56eWiThALTKPg8bllHQU0i9Tz0H4uBSd4x+/glUgODVCo5fCxYhgJPZPX88l4LQUofcry3I89CBhiu+rloE8RCkui4PG3ZR0FNIzT88+ALgUmesjw4JVIDg1Pp+Xxr2IYCDyS1vPJeS0FKX3K8tyQPwkXYrrs5aFQEQpLouDxt2UdBTOM0/PQgC4FJ3vH8N+UTA0NUKfk8K9iGgg8ktbzyXstBSh9y/PajDkIGWK66eWiThELTKPg8LdmHQUzjNPzz38uBSZ7x+/flEsNDVCn5O+wYhkIPJLW88l7LQcpfcvz2os5CBhiu+nlok0RC0yj4PG4Zh0FM4zS882ALgUme8fw35RLDQxQp+Tvr2EYCDuR1/PJeS0HKn3K89yLOAgXYrvq5aJNEQpMpN/xtmYdBTSM0vPPfzAFJnvH79+VTAwMUKfj76BhGAg7kdXzyXstByn8yvLajDgIF2K76OWjThENS6Pg8bdlHAU0jNLzz38vBSZ7x/DflUwMDVCn4++vYhkIPJLW88l7LQcofcry24o5CBhiu+rmpU4RC0yj3/G3ZRwFM43S88+BLwUle8fw35VLDAxPqOPvr2IXCD2R1/PJfC0HKH3K89uLOAgYYrrp5qNOEQtMot/xtmUcBTON0fPPgS8FJXzH79+VTAwMUKfk769iFwg9kdbzyXwuBil8yvPcizgIGGO76OajThELTKLf8LdmHQUzjdHzz4EvBSR8x+/flUwMDFCn5O+vYhgIPJHW88l8LgYpfMrz24s4CBdiu+rmo04RC0qj4PG3ZR0FM4zR889/MAUle8fw35RLDAxRpuPxr2IYCDuR1vPKei0HKX3K89uLOQgYYrvo5aNOEQpLpN/xs2YcBTON0fPOgC8FJXvH8N+USwwMUKfj769hGAg8kdbzyXotBSl9yvPbizgIF2K76+ajThELS6Lf8bdmHQUzjdHzz38vBSR7x/DflUsNDFCm4++vYhcIPZHW88l8LQYpfMrz24s5CBhiuuvmpE4RCkqk4PG2ZRwFNIzS88+ALgcle8fv35NMDAxQp+Pvr2IYCDyR1vPKfC0GKHzJ89uLOQgYYrvp5qNOEQpLo+Dxt2YdBTOM0vPPgC4FJXvH8N+TTA0LUKD/35NLDQxQpuPvr2EYCDyR1fPKei0HKX3K89uKOAgYYrvp5aJOEQtKo+Dxt2UcBTSM0vPPfzAFJnvI8N+VSwwMUKfj769iGAg8ktbzyXotByh9yvPcizgIGGK76eWiThEKS6Lg8bdlHQU0jNLzz4AuBSZ7yPDflEwMDFCn4++vYhgIPJLW88l8LQUofMry24s4CBdiu+nlok0RCkyj4PG3ZR0FNIzS88+ALgUle8jw35RMDAxQp+Twr2IYBzyS1vPKei0HKH3K89uLOAgXYrrp5aJNEQpMo+Dxt2YdBTSM0vPOgC4FJXvI8N+UTA0MUKfk77BiGAg7ktXzyXstByl8yvLbijgIF2K66eWiTRELTKPg8bdlHQU0jNLzz38vBSZ7yPDflEwMDFCn4++vYhgIO5LW88l8LQYpfMrz24s5CBhiu+rlo04RC0uk4PG2ZRwFNIvT88+ALgUme8jw35RMDAxPqOPvr2EYCDyS1fPJfC0HKXzK8tuLOQgYYrrp5aNOEQpMpN/xtmYcBTOM0vPPgC8FJXvI8N+UTA0MUKD/35RMDAxQp+Tvsn8=');
    const emmaCache = new Set();

    GM_registerMenuCommand("⚙️ Configuración", openConfig);
    GM_registerMenuCommand("📊 Estadísticas", showStats);
    GM_registerMenuCommand("🗑️ Restaurar ocultos", clearHidden);

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
