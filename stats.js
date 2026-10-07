// Live platform numbers for the Impact and Projects pages.
// Any element with data-stat="<name>" gets the current count. The number written in the
// HTML is the fallback, so the page still reads correctly if a request fails.
// Both keys are the platforms' public (publishable) keys, the same ones their own pages use.
(function () {
    const LEDGER = { url: "https://ursmecdpgtqckacyhnko.supabase.co", key: "sb_publishable_A0zmuZVHVPtosZrNdFE4GQ_sITuTrkg" };
    const VOICE  = { url: "https://lawteswyjpkovzagnshn.supabase.co", key: "sb_publishable_piPBYVy1yGEj_Iv0RCLtnA_PGzdT1bz" };

    const headers = (db, extra) => Object.assign({ apikey: db.key, Authorization: "Bearer " + db.key }, extra);

    // Row count without downloading the rows: PostgREST reports it in Content-Range.
    async function count(db, query) {
        const res = await fetch(`${db.url}/rest/v1/${query}`, { headers: headers(db, { Prefer: "count=exact", Range: "0-0" }) });
        const total = Number((res.headers.get("Content-Range") || "").split("/")[1]);
        if (!res.ok || !Number.isFinite(total)) throw new Error("count unavailable");
        return total;
    }

    // Employers are counted the way CandidateVoice groups them: names that differ only in
    // case or punctuation ("MasterCard" / "Mastercard") are one employer.
    async function employerCount() {
        const res = await fetch(`${VOICE.url}/rest/v1/reviews?select=employer_name&status=eq.approved&limit=10000`, { headers: headers(VOICE) });
        if (!res.ok) throw new Error("employers unavailable");
        const rows = await res.json();
        const slug = n => String(n || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        return new Set(rows.map(r => slug(r.employer_name)).filter(Boolean)).size;
    }

    const sources = {
        "ledger-businesses": () => count(LEDGER, "businesses?select=id"),
        "voice-reviews":     () => count(VOICE, "reviews?select=id&status=eq.approved"),
        "voice-employers":   employerCount,
    };

    const wanted = new Set([...document.querySelectorAll("[data-stat]")].map(el => el.dataset.stat));
    wanted.forEach(name => {
        if (!sources[name]) return;
        sources[name]().then(n => {
            document.querySelectorAll(`[data-stat="${name}"]`).forEach(el => { el.textContent = n.toLocaleString("en-US"); });
        }).catch(() => { /* keep the fallback number */ });
    });
})();
