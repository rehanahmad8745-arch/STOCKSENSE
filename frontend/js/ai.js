// frontend/js/ai.js — AI Insights: predictions + Google trend signals

async function loadAIPage() {
    const d = window._dashData;

    // Fast selling
    const fsEl = document.getElementById('ai-fast-selling');
    if (!d?.fastSelling?.length) {
        fsEl.innerHTML = '<div class="loading-row" style="color:var(--text3);">Go to Dashboard first to load data.</div>';
    } else {
        const max = d.fastSelling[0].total_sold;
        fsEl.innerHTML = d.fastSelling.map((item, i) => `
            <div class="trend-item">
                <div class="trend-rank">#${i+1}</div>
                <div class="trend-name">${item.item_name}</div>
                <div class="trend-bar-wrap"><div class="trend-bar" style="width:${Math.round(item.total_sold/max*100)}%"></div></div>
                <div class="trend-qty">${item.total_sold} sold</div>
            </div>`).join('');
    }

    // Low stock
    const lsEl = document.getElementById('ai-low-stock');
    if (!d?.lowStockItems?.length) {
        lsEl.innerHTML = '<div style="color:var(--green);font-size:13px;padding:8px 0;">✅ All items well-stocked</div>';
    } else {
        lsEl.innerHTML = d.lowStockItems.map(s => `
            <div class="alert-item">
                <div>
                    <div class="alert-name">${s.name}</div>
                    <div style="font-size:11px;color:var(--text3);">Threshold: ${s.low_stock_threshold}</div>
                </div>
                <div style="text-align:right;">
                    <div class="alert-qty">${s.qty} left</div>
                    <div style="font-size:11px;color:var(--text3);">${s.qty===0?'OUT':'Critical'}</div>
                </div>
            </div>`).join('');
    }

    // Season forecast
    const forecasts = [
        { event:'Summer (May–Jun)',  items:'Light cotton shirts, shorts, summer dresses', score:92, color:'var(--amber)' },
        { event:'Eid & Festivals',   items:'Kurtas, sherwanis, ethnic wear, dupattas',    score:88, color:'var(--green)' },
        { event:'Monsoon (Jul–Aug)', items:'Jackets, casual inners, waterproof accessories', score:65, color:'var(--blue)' },
    ];
    document.getElementById('ai-forecast').innerHTML = forecasts.map(f => `
        <div class="card card-sm" style="background:var(--bg3);">
            <div style="font-size:12px;color:var(--text3);margin-bottom:6px;">${f.event}</div>
            <div style="font-size:13px;color:var(--text);margin-bottom:10px;line-height:1.5;">${f.items}</div>
            <div style="display:flex;align-items:center;gap:8px;">
                <div style="flex:1;height:4px;background:var(--border);border-radius:2px;">
                    <div style="width:${f.score}%;height:4px;background:${f.color};border-radius:2px;"></div>
                </div>
                <span style="font-size:11px;color:${f.color};font-weight:600;">${f.score}%</span>
            </div>
        </div>`).join('');

    // Auto-load trends if business profile available
    if (window._bizProfile?.business_category) {
        loadAITrends(false);
    }
}

// ── Google Trends via Claude AI ────────────────────────────────────────────
async function loadAITrends(forceRefresh = false) {
    const biz      = window._bizProfile || {};
    const category = biz.business_category || 'Garments';
    const items    = biz.selling_items || '';
    const city     = biz.city || 'India';

    const container = document.getElementById('ai-trends-container');
    const metaEl    = document.getElementById('ai-trends-meta');
    const cacheEl   = document.getElementById('ai-trends-cache-badge');
    const refreshBtn= document.getElementById('ai-refresh-btn');

    refreshBtn.disabled = true;
    refreshBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg> Loading...`;
    container.innerHTML = `<div class="loading-row"><div class="spinner" style="display:inline-block;margin-right:8px;"></div> Calling Claude AI to analyse Google trends for "${category}"...</div>`;

    if (forceRefresh) await API.refreshTrends(category);

    const res = await API.getAITrends(category, items, city);

    refreshBtn.disabled = false;
    refreshBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg> Refresh Trends`;

    if (!res?.success || !res.data) {
        container.innerHTML = `<div class="loading-row" style="color:var(--red);">Failed to load trends. Check server logs.</div>`;
        return;
    }

    const data = res.data;
    metaEl.textContent = `Category: ${category} · City: ${city} · ${new Date().toLocaleDateString('en-IN',{month:'long',year:'numeric'})}`;
    cacheEl.textContent = res.fromCache ? 'Cached' : 'Fresh';
    cacheEl.className   = 'badge ' + (res.fromCache ? 'badge-gray' : 'badge-green');

    // Render trends table
    const TREND_COLOR = { rising:'var(--green)', stable:'var(--amber)', falling:'var(--red)' };
    const TREND_ICON  = { rising:'↑', stable:'→', falling:'↓' };
    const VOLUME_CLASS= { High:'badge-red', Medium:'badge-amber', Low:'badge-gray' };

    container.innerHTML = `
        <div class="table-wrap">
            <table>
                <thead><tr><th>#</th><th>Search Term</th><th>Volume</th><th>Trend</th><th>Score</th></tr></thead>
                <tbody>
                    ${data.top_searches.map(t => `
                    <tr>
                        <td style="font-family:'Space Mono',monospace;color:var(--text3);">${t.rank}</td>
                        <td style="font-weight:500;color:var(--text);">${t.term}</td>
                        <td><span class="badge ${VOLUME_CLASS[t.volume]||'badge-gray'}">${t.volume}</span></td>
                        <td style="color:${TREND_COLOR[t.trend]||'var(--text2)'};">
                            ${TREND_ICON[t.trend]||'→'} ${t.trend}
                        </td>
                        <td>
                            <div style="display:flex;align-items:center;gap:8px;">
                                <div style="width:60px;height:4px;background:var(--border);border-radius:2px;">
                                    <div style="width:${t.score}%;height:4px;background:var(--accent);border-radius:2px;"></div>
                                </div>
                                <span style="font-size:11px;color:var(--text2);font-family:'Space Mono',monospace;">${t.score}</span>
                            </div>
                        </td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>
        ${data.season_tip ? `<div class="info-box info-tip" style="margin-top:12px;background:var(--blue-dim);border:1px solid rgba(59,130,246,0.2);border-radius:8px;padding:12px;font-size:13px;color:#93c5fd;">💡 <strong>Tip:</strong> ${data.season_tip}</div>` : ''}
        ${data.opportunity ? `<div style="background:var(--green-dim);border:1px solid rgba(34,197,94,0.2);border-radius:8px;padding:12px;margin-top:8px;font-size:13px;color:var(--green);">🎯 <strong>Opportunity:</strong> ${data.opportunity}</div>` : ''}
    `;

    // Rising fast tags
    if (data.rising_fast?.length) {
        document.getElementById('ai-rising-fast').innerHTML = data.rising_fast.map(term =>
            `<span style="padding:6px 14px;border-radius:20px;background:var(--green-dim);border:1px solid rgba(34,197,94,0.2);color:var(--green);font-size:12px;font-weight:500;">↑ ${term}</span>`
        ).join('');
    }

    // Cache for AI prediction
    window._trendData = data;
}

// ── Claude AI Sales Prediction ────────────────────────────────────────────
async function getAIPrediction() {
    const btn     = document.getElementById('ai-btn');
    const content = document.getElementById('ai-content');
    btn.disabled  = true;
    btn.textContent = '🤖 Analyzing...';
    content.textContent = 'Connecting to Claude AI and analysing your store data and trend signals...';

    const d      = window._dashData;
    const biz    = window._bizProfile || {};
    const trends = window._trendData;

    const topSold  = d?.fastSelling?.slice(0,5).map(i=>`${i.item_name} (${i.total_sold} sold)`).join(', ') || 'No data';
    const lowItems = d?.lowStockItems?.map(i=>`${i.name} (${i.qty} left)`).join(', ') || 'None';
    const trendStr = trends?.top_searches?.slice(0,5).map(t=>`"${t.term}" (${t.trend})`).join(', ') || 'Not loaded';
    const risingStr= trends?.rising_fast?.join(', ') || 'Not loaded';
    const category = biz.business_category || 'Garments';
    const city     = biz.city || 'India';

    const prompt = `You are a retail AI analyst for an Indian ${category} store in ${city}.

Store performance data:
- Top selling items (last 30 days): ${topSold}
- Low stock alerts: ${lowItems}
- Current month: ${new Date().toLocaleString('en-IN',{month:'long'})} ${new Date().getFullYear()}

Google Trend signals for ${category}:
- Top searches: ${trendStr}
- Rising fast: ${risingStr}

Based on store performance AND current Google search trends, provide:
1. Top 3 items predicted to sell fast next 30 days (use trend data as evidence)
2. Urgent restock recommendations (match low stock with trending items)
3. One pricing or promotional tactic based on what customers are searching for
4. Festival/season tip specific to ${city} in the current month

Keep it under 200 words. Be specific and actionable for an Indian retail ${category} store.`;

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 1000,
                messages: [{ role:'user', content: prompt }]
            })
        });
        const data = await response.json();
        content.textContent = data.content?.[0]?.text || 'No response received.';
    } catch(err) {
        content.textContent = 'Error: ' + err.message;
    }

    btn.disabled = false;
    btn.textContent = '🤖 Get AI Prediction';
}
