import React, { useState, useRef, useEffect, useCallback } from "react";

const EMOJI_REACTIONS = ["😂", "😱", "💅", "😤", "💀", "👀"];

const CATEGORIES = [
  { id: "all",       label: "All Tea ☕",   color: "#f59e42" },
  { id: "celebrity", label: "Celebrity 💫", color: "#e879a0" },
  { id: "anonymous", label: "Anonymous 🎭", color: "#7c6af7" },
  { id: "fiction",   label: "Fiction 📖",   color: "#34d399" },
];

const TAGS = [
  "Office Drama",
  "Celebrity Tea",
  "Friend Drama",
  "Reality TV",
  "Neighbour Files",
  "Family Chaos",
  "Dating Disaster",
];

const TAG_CATEGORY = {
  "Office Drama":    "anonymous",
  "Celebrity Tea":   "celebrity",
  "Friend Drama":    "fiction",
  "Reality TV":      "celebrity",
  "Neighbour Files": "anonymous",
  "Family Chaos":    "anonymous",
  "Dating Disaster": "anonymous",
};

const AI_RESPONSES = [
  "Oh honey, that is genuinely chaotic energy and I am HERE for it 👀",
  "The audacity!! Please tell me there is more to this story 🍿",
  "This is the kind of drama that keeps the world spinning honestly 😂",
  "I felt that in my soul. You needed to get that OUT. How do you feel now? 💆",
  "That is a lot. But also incredibly valid. You deserve to vent! 💅",
  "The way I gasped reading this. Drama is truly universal 😱",
  "This is giving main character energy whether they like it or not 👑",
  "Okay but WHY do people do this?? You are completely justified 😤",
];

const SEED_POSTS = [
  {
    id: "seed-1",
    category: "celebrity",
    content: "Apparently my fave celeb showed up 3 hours late to their own fan meet and just... left after 10 minutes 💀",
    reactions: { "😂": 42, "😱": 31, "💅": 18, "😤": 5, "💀": 9, "👀": 3 },
    time: "2m ago",
    tag: "Celebrity Tea",
    ts: Date.now() - 120000,
  },
  {
    id: "seed-2",
    category: "anonymous",
    content: "My coworker keeps microwaving fish EVERY single day and nobody has the guts to say anything. I am losing my mind.",
    reactions: { "😂": 89, "😱": 12, "💅": 6, "😤": 54, "💀": 23, "👀": 8 },
    time: "5m ago",
    tag: "Office Drama",
    ts: Date.now() - 300000,
  },
  {
    id: "seed-3",
    category: "fiction",
    content: "Ok so in my friend group: Alex told Jamie that Sam said something shady — turns out Alex made it ALL up for attention. The chaos 🍿",
    reactions: { "😂": 20, "😱": 67, "💅": 12, "😤": 10, "💀": 5, "👀": 45 },
    time: "12m ago",
    tag: "Friend Drama",
    ts: Date.now() - 720000,
  },
  {
    id: "seed-4",
    category: "celebrity",
    content: "That reunion episode was so scripted it hurt. They clearly rehearsed the spontaneous argument. We are not blind!",
    reactions: { "😂": 34, "😱": 20, "💅": 56, "😤": 78, "💀": 11, "👀": 7 },
    time: "18m ago",
    tag: "Reality TV",
    ts: Date.now() - 1080000,
  },
  {
    id: "seed-5",
    category: "anonymous",
    content: "My neighbour has been playing the same 3 songs on loop for 6 months. I know their entire playlist by heart now. Send help.",
    reactions: { "😂": 112, "😱": 15, "💅": 9, "😤": 29, "💀": 67, "👀": 4 },
    time: "25m ago",
    tag: "Neighbour Files",
    ts: Date.now() - 1500000,
  },
];

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=DM+Sans:wght@300;400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  @keyframes floatUp {
    0%   { transform: translateY(0) scale(1);       opacity: 1; }
    100% { transform: translateY(-130px) scale(1.5); opacity: 0; }
  }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.15; }
  }
  @keyframes slideIn {
    from { transform: translateY(16px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
  @keyframes glowPulse {
    0%, 100% { box-shadow: 0 0 18px #b06aff30; }
    50%       { box-shadow: 0 0 36px #b06aff70; }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  .wb-post       { animation: slideIn 0.35s ease forwards; }
  .wb-pill       { transition: all 0.18s ease; cursor: pointer; }
  .wb-pill:hover { opacity: 0.8; transform: translateY(-1px); }
  .wb-react      { transition: transform 0.12s ease; cursor: pointer; }
  .wb-react:hover { transform: scale(1.25); }
  .wb-spinner    { width: 18px; height: 18px; border: 2px solid #b06aff44; border-top-color: #b06aff; border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block; }

  textarea { resize: none; }
  textarea:focus { outline: none; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: #1a1225; }
  ::-webkit-scrollbar-thumb { background: #5a3a8a; border-radius: 2px; }
`;

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60)  return "just now";
  if (diff < 3600) return Math.floor(diff / 60) + "m ago";
  if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
  return Math.floor(diff / 86400) + "d ago";
}

// ── Shared storage helpers ──────────────────────────────────────────────────
const STORAGE_KEY = "wb-posts-v1";

async function loadPosts() {
  try {
    const res = await window.storage.get(STORAGE_KEY, true); // shared=true
    if (res && res.value) {
      const parsed = JSON.parse(res.value);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) {}
  // First load — seed with sample posts and save
  await savePosts(SEED_POSTS);
  return SEED_POSTS;
}

async function savePosts(posts) {
  try {
    await window.storage.set(STORAGE_KEY, JSON.stringify(posts), true); // shared=true
  } catch (_) {}
}

// ── Component ───────────────────────────────────────────────────────────────
export default function WhisperBoard() {
  const [posts, setPosts]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [activeCategory, setCategory] = useState("all");
  const [newPost, setNewPost]         = useState("");
  const [selectedTag, setSelectedTag] = useState("Office Drama");
  const [showAI, setShowAI]           = useState(false);
  const [aiMessage, setAiMessage]     = useState("");
  const [aiTyping, setAiTyping]       = useState(false);
  const [submitted, setSubmitted]     = useState(false);
  const [reacted, setReacted]         = useState({});
  const [floaters, setFloaters]       = useState([]);
  const [syncMsg, setSyncMsg]         = useState("");
  const timerRef                      = useRef(null);
  const pollRef                       = useRef(null);

  // Load posts on mount + poll every 5s for new posts from others
  const fetchPosts = useCallback(async () => {
    const fresh = await loadPosts();
    setPosts(fresh);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPosts();
    pollRef.current = setInterval(fetchPosts, 5000);
    return () => clearInterval(pollRef.current);
  }, [fetchPosts]);

  const filtered = activeCategory === "all"
    ? posts
    : posts.filter(p => p.category === activeCategory);

  function spawnFloater(emoji) {
    const id = Date.now() + Math.random();
    const x  = Math.random() * 70 + 10;
    setFloaters(prev => [...prev, { id, emoji, x }]);
    setTimeout(() => setFloaters(prev => prev.filter(f => f.id !== id)), 1700);
  }

  async function handleReact(postId, emoji) {
    const key = postId + "-" + emoji;
    if (reacted[key]) return;
    setReacted(prev => ({ ...prev, [key]: true }));

    const updated = posts.map(p =>
      p.id !== postId
        ? p
        : { ...p, reactions: { ...p.reactions, [emoji]: (p.reactions[emoji] || 0) + 1 } }
    );
    setPosts(updated);
    await savePosts(updated);
    spawnFloater(emoji);
  }

  async function handleSubmit() {
    if (!newPost.trim()) return;

    const entry = {
      id:        "post-" + Date.now(),
      category:  TAG_CATEGORY[selectedTag] || "anonymous",
      content:   newPost,
      reactions: { "😂": 0, "😱": 0, "💅": 0, "😤": 0, "💀": 0, "👀": 0 },
      time:      "just now",
      tag:       selectedTag,
      ts:        Date.now(),
    };

    const updated = [entry, ...posts];
    setPosts(updated);
    await savePosts(updated);

    setNewPost("");
    setSubmitted(true);
    setShowAI(true);
    setAiTyping(true);
    setAiMessage("");

    // Show sync confirmation
    setSyncMsg("✓ Your whisper is live for everyone!");
    setTimeout(() => setSyncMsg(""), 3000);

    const reply = AI_RESPONSES[Math.floor(Math.random() * AI_RESPONSES.length)];
    let i = 0;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      i++;
      setAiMessage(reply.slice(0, i));
      if (i >= reply.length) {
        clearInterval(timerRef.current);
        setAiTyping(false);
      }
    }, 28);

    setTimeout(() => setSubmitted(false), 3000);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{STYLES}</style>
      <div style={{ minHeight: "100vh", background: "#0d0a14", color: "#f0e6ff", position: "relative", overflowX: "hidden" }}>

        {/* Ambient blobs */}
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
          <div style={{ position: "absolute", top: "-8%",  left: "-4%",  width: 420, height: 420, borderRadius: "50%", background: "radial-gradient(circle, rgba(90,26,138,0.16) 0%, transparent 70%)" }} />
          <div style={{ position: "absolute", bottom: "8%", right: "-4%", width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle, rgba(232,121,160,0.10) 0%, transparent 70%)" }} />
          <div style={{ position: "absolute", top: "45%",  left: "38%",  width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(245,158,66,0.06) 0%, transparent 70%)" }} />
        </div>

        {/* Floating emoji particles */}
        {floaters.map(f => (
          <div key={f.id} style={{ position: "fixed", left: f.x + "%", bottom: "22%", fontSize: "1.8rem", animation: "floatUp 1.7s ease-out forwards", pointerEvents: "none", zIndex: 9999 }}>
            {f.emoji}
          </div>
        ))}

        {/* Live sync toast */}
        {syncMsg && (
          <div style={{
            position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
            background: "linear-gradient(135deg, #34d399, #10b981)",
            color: "white", padding: "10px 20px", borderRadius: 30,
            fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem",
            zIndex: 9998, animation: "fadeIn 0.3s ease",
            boxShadow: "0 4px 20px rgba(52,211,153,0.35)",
          }}>
            {syncMsg}
          </div>
        )}

        <div style={{ position: "relative", zIndex: 1, maxWidth: 680, margin: "0 auto", padding: "0 16px 80px" }}>

          {/* Header */}
          <div style={{ textAlign: "center", padding: "44px 0 28px" }}>
            <p style={{ fontSize: "0.72rem", letterSpacing: "0.28em", color: "#b06aff", textTransform: "uppercase", marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>
              🤫 anonymous · shared · cathartic
            </p>
            <h1 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(2.4rem, 9vw, 3.6rem)", fontWeight: 700,
              background: "linear-gradient(135deg, #f0e6ff 0%, #b06aff 50%, #e879a0 100%)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              animation: "shimmer 4s linear infinite",
            }}>
              Whisper Board
            </h1>
            <p style={{ fontFamily: "'DM Sans', sans-serif", color: "#8870aa", fontSize: "0.92rem", marginTop: 10, fontWeight: 300 }}>
              Spill the tea. Everyone sees it. No judgment here.
            </p>
            {/* Live indicator */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10, padding: "4px 12px", borderRadius: 20, background: "#1a1230", border: "1px solid #2d1f48" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#34d399", display: "inline-block", boxShadow: "0 0 6px #34d399" }} />
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.68rem", color: "#6a9a80" }}>Live · syncs every 5s</span>
            </div>
          </div>

          {/* Compose box */}
          <div style={{
            background: "linear-gradient(135deg, #1e1530 0%, #16102a 100%)",
            border: "1px solid #3d2a5a", borderRadius: 20,
            padding: 20, marginBottom: 20,
            animation: "glowPulse 4s ease-in-out infinite",
          }}>
            <p style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", color: "#b06aff", marginBottom: 12, fontSize: "1rem" }}>
              What are you dying to say? 👀
            </p>

            <textarea
              value={newPost}
              onChange={e => setNewPost(e.target.value)}
              placeholder="Spill anonymously... everyone will see it 🤫"
              rows={3}
              style={{
                width: "100%", display: "block",
                background: "rgba(13,10,20,0.5)",
                border: "1px solid #3d2a5a", borderRadius: 12,
                padding: "11px 14px", color: "#f0e6ff",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.88rem", lineHeight: 1.6,
              }}
            />

            {/* Tag pills */}
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", margin: "12px 0" }}>
              {TAGS.map(tag => (
                <button key={tag} onClick={() => setSelectedTag(tag)} style={{
                  padding: "4px 12px", borderRadius: 20,
                  border: "1px solid " + (selectedTag === tag ? "#b06aff" : "#3d2a5a"),
                  background: selectedTag === tag ? "#3d1a6a" : "transparent",
                  color: selectedTag === tag ? "#e0c8ff" : "#7a6a9a",
                  fontFamily: "'DM Sans', sans-serif", fontSize: "0.73rem", cursor: "pointer", transition: "all 0.18s",
                }}>
                  {tag}
                </button>
              ))}
            </div>

            <button onClick={handleSubmit} style={{
              width: "100%", padding: "12px",
              background: submitted
                ? "linear-gradient(135deg, #34d399, #10b981)"
                : "linear-gradient(135deg, #7c3aed, #b06aff)",
              border: "none", borderRadius: 12, color: "white",
              fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: "0.93rem",
              cursor: "pointer", transition: "all 0.28s", letterSpacing: "0.05em",
            }}>
              {submitted ? "✓ Whispered to everyone!" : "Whisper it 🌙"}
            </button>
          </div>

          {/* AI response */}
          {showAI && (
            <div style={{
              background: "linear-gradient(135deg, #1a0f2e, #221040)",
              border: "1px solid rgba(176,106,255,0.2)", borderRadius: 16,
              padding: "16px 20px", marginBottom: 20, animation: "slideIn 0.38s ease",
              display: "flex", gap: 12, alignItems: "flex-start",
            }}>
              <span style={{ fontSize: "1.5rem", flexShrink: 0 }}>🧿</span>
              <div>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.68rem", color: "#b06aff", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 6 }}>
                  Whisper AI · your gossip confidant
                </p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", color: "#e0c8ff", fontSize: "0.88rem", lineHeight: 1.65 }}>
                  {aiMessage}
                  {aiTyping && <span style={{ animation: "blink 0.75s infinite", marginLeft: 2 }}>▌</span>}
                </p>
                {!aiTyping && (
                  <button onClick={() => setShowAI(false)} style={{ marginTop: 8, background: "none", border: "none", color: "#6a5a8a", fontFamily: "'DM Sans', sans-serif", fontSize: "0.73rem", cursor: "pointer", padding: 0 }}>
                    dismiss ×
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Category filter */}
          <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
            {CATEGORIES.map(cat => (
              <button key={cat.id} className="wb-pill" onClick={() => setCategory(cat.id)} style={{
                padding: "7px 16px", borderRadius: 30,
                border: "1px solid " + (activeCategory === cat.id ? cat.color : "#3d2a5a"),
                background: activeCategory === cat.id ? cat.color + "22" : "transparent",
                color: activeCategory === cat.id ? cat.color : "#7a6a9a",
                fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", fontWeight: 500,
              }}>
                {cat.label}
              </button>
            ))}
          </div>

          {/* Loading state */}
          {loading && (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#7a6a9a", fontFamily: "'DM Sans', sans-serif" }}>
              <div className="wb-spinner" style={{ margin: "0 auto 12px" }} />
              <p style={{ fontSize: "0.85rem" }}>Loading whispers...</p>
            </div>
          )}

          {/* Posts feed */}
          {!loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {filtered.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#5a4a7a", fontFamily: "'DM Sans', sans-serif", fontSize: "0.88rem" }}>
                  No whispers here yet. Be the first! 🌙
                </div>
              )}
              {filtered.map((post, i) => (
                <div key={post.id} className="wb-post" style={{
                  background: "linear-gradient(135deg, #1a1230 0%, #150e28 100%)",
                  border: "1px solid #2d1f48", borderRadius: 18, padding: "18px 20px",
                  animationDelay: (i * 0.05) + "s", opacity: 0, animationFillMode: "forwards",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ padding: "3px 10px", borderRadius: 20, background: "#3d1a6a", color: "#c090ff", fontFamily: "'DM Sans', sans-serif", fontSize: "0.68rem", letterSpacing: "0.05em" }}>
                      {post.tag}
                    </span>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.68rem", color: "#5a4a7a" }}>
                      {post.ts ? timeAgo(post.ts) : post.time}
                    </span>
                  </div>

                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.88rem", lineHeight: 1.72, color: "#ddd0f5", marginBottom: 14 }}>
                    {post.content}
                  </p>

                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {EMOJI_REACTIONS.map(emoji => {
                      const count      = post.reactions[emoji] || 0;
                      const hasReacted = reacted[post.id + "-" + emoji];
                      return (
                        <button key={emoji} className="wb-react" onClick={() => handleReact(post.id, emoji)} style={{
                          display: "flex", alignItems: "center", gap: 4,
                          padding: "5px 10px", borderRadius: 20,
                          border: "1px solid " + (hasReacted ? "rgba(176,106,255,0.35)" : "#2d1f48"),
                          background: hasReacted ? "rgba(61,26,106,0.28)" : "rgba(13,10,20,0.35)",
                          color: "#f0e6ff", fontFamily: "'DM Sans', sans-serif", fontSize: "0.8rem",
                        }}>
                          {emoji}
                          {count > 0 && <span style={{ color: "#9980bb", fontSize: "0.68rem" }}>{count}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <p style={{ textAlign: "center", marginTop: 44, fontFamily: "'DM Sans', sans-serif", fontSize: "0.72rem", color: "#3d2a5a" }}>
            🌙 All whispers are anonymous · Spread joy, not harm
          </p>

        </div>
      </div>
    </>
  );
}
