// backend/routes/aitrends.js
// AI-powered Google trend predictions per business category
// Uses Claude AI to simulate real trending search data

const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

const CACHE_HOURS = 6; // Re-fetch AI data every 6 hours

// GET /api/aitrends?category=Garments&items=Shirts,Jeans
router.get('/', async (req, res) => {
    const category     = req.query.category || 'Retail';
    const sellingItems = req.query.items    || '';
    const city         = req.query.city     || 'India';

    try {
        // Check cache first
        const [cached] = await db.query(
            `SELECT result_json, cached_at FROM ai_trend_cache
             WHERE business_category = ?
             AND cached_at > DATE_SUB(NOW(), INTERVAL ? HOUR)
             ORDER BY cached_at DESC LIMIT 1`,
            [category, CACHE_HOURS]
        );

        if (cached.length && cached[0].result_json) {
            return res.json({ success: true, data: JSON.parse(cached[0].result_json), fromCache: true });
        }

        // Call Claude AI
        const prompt = buildTrendPrompt(category, sellingItems, city);
        const aiResult = await callClaudeForTrends(prompt);

        if (!aiResult) {
            return res.status(500).json({ success: false, message: 'AI service unavailable' });
        }

        // Parse JSON from AI response
        let parsed;
        try {
            const clean = aiResult.replace(/```json|```/g, '').trim();
            parsed = JSON.parse(clean);
        } catch {
            return res.status(500).json({ success: false, message: 'AI returned invalid data', raw: aiResult });
        }

        // Save to cache
        await db.query(
            `INSERT INTO ai_trend_cache (business_category, result_json) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE result_json = VALUES(result_json), cached_at = NOW()`,
            [category, JSON.stringify(parsed)]
        ).catch(() => {}); // non-critical

        res.json({ success: true, data: parsed, fromCache: false });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/aitrends/refresh — force refresh cache
router.post('/refresh', async (req, res) => {
    const { category } = req.body;
    try {
        await db.query('DELETE FROM ai_trend_cache WHERE business_category = ?', [category || '']);
        res.json({ success: true, message: 'Cache cleared — next request will refresh' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

function buildTrendPrompt(category, sellingItems, city) {
    const month = new Date().toLocaleString('en-IN', { month: 'long' });
    const year  = new Date().getFullYear();
    return `You are a Google Trends and retail market analyst for India.

Business category: ${category}
Main selling items: ${sellingItems || 'Various products'}
Location: ${city}, India
Current month: ${month} ${year}

Generate realistic Google search trend data for this business category in India right now.
Return ONLY a valid JSON object (no markdown, no extra text) with this exact structure:
{
  "top_searches": [
    { "rank": 1, "term": "search term", "volume": "High/Medium/Low", "trend": "rising/stable/falling", "score": 95 },
    { "rank": 2, "term": "search term", "volume": "High/Medium/Low", "trend": "rising/stable/falling", "score": 88 },
    { "rank": 3, "term": "search term", "volume": "High/Medium/Low", "trend": "rising/stable/falling", "score": 82 },
    { "rank": 4, "term": "search term", "volume": "High/Medium/Low", "trend": "rising/stable/falling", "score": 76 },
    { "rank": 5, "term": "search term", "volume": "High/Medium/Low", "trend": "rising/stable/falling", "score": 70 },
    { "rank": 6, "term": "search term", "volume": "High/Medium/Low", "trend": "rising/stable/falling", "score": 65 },
    { "rank": 7, "term": "search term", "volume": "High/Medium/Low", "trend": "rising/stable/falling", "score": 58 },
    { "rank": 8, "term": "search term", "volume": "High/Medium/Low", "trend": "rising/stable/falling", "score": 50 }
  ],
  "rising_fast": ["term1", "term2", "term3"],
  "season_tip": "One sentence about what is trending this month for this category in India",
  "opportunity": "One specific product or item this business should stock urgently based on trends"
}

Make search terms realistic for Indian consumers searching on Google for ${category} products in ${month}.`;
}

async function callClaudeForTrends(prompt) {
    try {
        const fetch = (...args) => import('node-fetch').then(m => m.default(...args));
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 1000,
                messages: [{ role: 'user', content: prompt }]
            })
        });
        const data = await response.json();
        return data.content?.[0]?.text || null;
    } catch (err) {
        console.error('Claude AI call failed:', err.message);
        return null;
    }
}

module.exports = router;
