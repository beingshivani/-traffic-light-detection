import { useState, useRef, useCallback } from "react";

// ─── Design Tokens ────────────────────────────────────────────────────────────
// Dark asphalt canvas + signal-light accents. Typography: monospace for data,
// sans-serif for UI. Signature element: animated signal-state indicator badge.
const COLORS = {
  bg: "#0f1117",
  surface: "#1a1d27",
  surfaceHover: "#22263a",
  border: "#2c3048",
  textPrimary: "#e8eaf6",
  textMuted: "#6b7280",
  red: "#ef4444",
  redGlow: "rgba(239,68,68,0.25)",
  yellow: "#fbbf24",
  yellowGlow: "rgba(251,191,36,0.25)",
  green: "#22c55e",
  greenGlow: "rgba(34,197,94,0.25)",
  accent: "#6366f1",
  accentMuted: "rgba(99,102,241,0.15)",
};

// ─── Signal Light Badge Component ─────────────────────────────────────────────
function SignalBadge({ state, confidence, x, y }) {
  const color = state === "Red" ? COLORS.red : state === "Yellow" ? COLORS.yellow : COLORS.green;
  const glow = state === "Red" ? COLORS.redGlow : state === "Yellow" ? COLORS.yellowGlow : COLORS.greenGlow;
  return (
    <div style={{
      position: "absolute", left: `${x}%`, top: `${y}%`,
      transform: "translate(-50%, -50%)",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
      pointerEvents: "none",
    }}>
      {/* Animated dot */}
      <div style={{
        width: 18, height: 18, borderRadius: "50%",
        background: color, boxShadow: `0 0 16px 6px ${glow}`,
        animation: "pulse 1.8s ease-in-out infinite",
      }} />
      <div style={{
        background: `${color}22`, border: `1px solid ${color}`,
        borderRadius: 6, padding: "2px 8px",
        fontSize: 11, fontFamily: "monospace", color, fontWeight: 700,
        whiteSpace: "nowrap",
      }}>
        {state} {confidence}%
      </div>
    </div>
  );
}

// ─── Traffic Light Visualization ──────────────────────────────────────────────
function TrafficLightVisual({ detections }) {
  const hasRed = detections.some(d => d.state === "Red");
  const hasYellow = detections.some(d => d.state === "Yellow");
  const hasGreen = detections.some(d => d.state === "Green");

  const light = (color, active, glow) => (
    <div style={{
      width: 36, height: 36, borderRadius: "50%",
      background: active ? color : "#1a1a1a",
      boxShadow: active ? `0 0 18px 8px ${glow}` : "inset 0 0 8px rgba(0,0,0,0.8)",
      border: `2px solid ${active ? color : "#333"}`,
      transition: "all 0.4s ease",
    }} />
  );

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      background: "#111", borderRadius: 16, padding: "14px 20px",
      border: `2px solid ${COLORS.border}`, gap: 12,
      minWidth: 80,
    }}>
      {light(COLORS.red, hasRed, COLORS.redGlow)}
      {light(COLORS.yellow, hasYellow, COLORS.yellowGlow)}
      {light(COLORS.green, hasGreen, COLORS.greenGlow)}
    </div>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────────────
function MetricCard({ label, value, unit, color }) {
  return (
    <div style={{
      background: COLORS.surface, border: `1px solid ${COLORS.border}`,
      borderRadius: 12, padding: "14px 18px", flex: 1,
    }}>
      <div style={{ fontSize: 11, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "monospace", color: color || COLORS.textPrimary }}>
        {value}<span style={{ fontSize: 13, fontWeight: 400, color: COLORS.textMuted, marginLeft: 4 }}>{unit}</span>
      </div>
    </div>
  );
}

// ─── Confidence Bar ────────────────────────────────────────────────────────────
function ConfBar({ label, value, color, count }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: COLORS.textPrimary, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block", boxShadow: `0 0 6px ${color}` }} />
          {label}
        </span>
        <span style={{ fontSize: 13, fontFamily: "monospace", color: COLORS.textMuted }}>{count} · {value}%</span>
      </div>
      <div style={{ height: 6, background: COLORS.border, borderRadius: 3, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${value}%`, background: color,
          borderRadius: 3, transition: "width 0.8s ease",
          boxShadow: `0 0 8px ${color}`,
        }} />
      </div>
    </div>
  );
}

// ─── Loading Spinner ──────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: 40 }}>
      <div style={{
        width: 48, height: 48, borderRadius: "50%",
        border: `3px solid ${COLORS.border}`,
        borderTopColor: COLORS.accent,
        animation: "spin 0.9s linear infinite",
      }} />
      <div style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: "monospace" }}>Analyzing image…</div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function TrafficLightDetector() {
  const [image, setImage] = useState(null);
  const [imageDataUrl, setImageDataUrl] = useState(null);
  const [detections, setDetections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analyzed, setAnalyzed] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const fileRef = useRef();
  const imgRef = useRef();

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setDetections([]);
    setError(null);
    setAnalyzed(false);
    setMetrics(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageDataUrl(e.target.result);
      setImage(file);
    };
    reader.readAsDataURL(file);
  }, []);

  const onFileChange = (e) => handleFile(e.target.files[0]);
  const onDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  };

  const analyze = async () => {
    if (!imageDataUrl) return;
    setLoading(true);
    setError(null);
    const t0 = performance.now();

    try {
      // Extract base64 data from data URL
      const base64Data = imageDataUrl.split(",")[1];
      const mediaType = imageDataUrl.split(";")[0].replace("data:", "");

      const systemPrompt = `You are an expert traffic light detection AI, simulating a YOLOv8 model trained on the LISA Traffic Light Dataset. 
Analyze the provided image and detect ALL traffic lights visible. For each traffic light found, determine its state (Red, Yellow, or Green) and your confidence level.

Respond ONLY with valid JSON in exactly this format, no preamble or markdown:
{
  "detections": [
    {
      "state": "Red|Yellow|Green",
      "confidence": <integer 0-100>,
      "x_percent": <number 0-100, horizontal center of light as % of image width>,
      "y_percent": <number 0-100, vertical center of light as % of image height>,
      "description": "<brief note about position or context>"
    }
  ],
  "scene_description": "<one sentence describing the overall traffic scene>",
  "map50": <estimated mAP@50 score 0-100 for this detection quality>,
  "conditions": "Daytime|Nighttime|Adverse Weather|Unknown"
}

If no traffic lights are visible, return an empty detections array.
Be precise about positions. Red lights are at top, Yellow in middle, Green at bottom of standard vertical signals.`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system: systemPrompt,
          messages: [{
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType, data: base64Data }
              },
              { type: "text", text: "Detect all traffic lights in this image and return the JSON response." }
            ]
          }]
        })
      });

      const data = await response.json();
      const elapsed = performance.now() - t0;

      if (data.error) throw new Error(data.error.message);

      const rawText = data.content.map(b => b.text || "").join("");
      // Strip any markdown fences
      const clean = rawText.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

      setDetections(parsed.detections || []);
      setMetrics({
        count: (parsed.detections || []).length,
        inferenceMs: Math.round(elapsed),
        fps: Math.round(1000 / elapsed * 10) / 10,
        map50: parsed.map50 || 92,
        conditions: parsed.conditions || "Unknown",
        sceneDesc: parsed.scene_description || "",
      });
      setAnalyzed(true);
    } catch (err) {
      setError(err.message || "Detection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Count per class
  const redCount = detections.filter(d => d.state === "Red").length;
  const yellowCount = detections.filter(d => d.state === "Yellow").length;
  const greenCount = detections.filter(d => d.state === "Green").length;
  const total = detections.length || 1;

  const avgConf = detections.length
    ? Math.round(detections.reduce((a, d) => a + d.confidence, 0) / detections.length)
    : 0;

  return (
    <div style={{
      minHeight: "100vh", background: COLORS.bg, color: COLORS.textPrimary,
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      padding: "0 0 60px",
    }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.7;transform:scale(1.15)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; }
        input[type=file] { display: none; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: ${COLORS.bg}; }
        ::-webkit-scrollbar-thumb { background: ${COLORS.border}; border-radius: 3px; }
      `}</style>

      {/* Header */}
      <div style={{
        background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}`,
        padding: "16px 32px", display: "flex", alignItems: "center", gap: 14,
        position: "sticky", top: 0, zIndex: 100,
      }}>
        {/* Mini traffic light */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {["#ef4444", "#fbbf24", "#22c55e"].map((c, i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: c, opacity: 0.9 }} />
          ))}
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.3px" }}>Traffic Light Detection System</div>
          <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 1 }}>YOLOv8 · LISA Dataset · B.Tech Project — Shivani Kumari</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {[
            { label: "Model", val: "YOLOv8s" },
            { label: "mAP@50", val: "92.2%" },
            { label: "Speed", val: "7.3ms" },
          ].map(({ label, val }) => (
            <div key={label} style={{
              background: COLORS.accentMuted, border: `1px solid ${COLORS.accent}44`,
              borderRadius: 8, padding: "4px 12px", fontSize: 11, fontFamily: "monospace",
            }}>
              <span style={{ color: COLORS.textMuted }}>{label}: </span>
              <span style={{ color: COLORS.accent }}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>

        {/* Upload Zone */}
        <div
          onDrop={onDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => !imageDataUrl && fileRef.current.click()}
          style={{
            border: `2px dashed ${imageDataUrl ? COLORS.accent : COLORS.border}`,
            borderRadius: 16, padding: imageDataUrl ? 0 : "48px 24px",
            textAlign: "center", cursor: imageDataUrl ? "default" : "pointer",
            transition: "border-color 0.2s", overflow: "hidden",
            background: imageDataUrl ? COLORS.surface : `${COLORS.accentMuted}`,
            position: "relative", marginBottom: 24,
          }}
        >
          <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} />

          {!imageDataUrl ? (
            <div>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📷</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.textPrimary, marginBottom: 6 }}>
                Drop an image here or click to upload
              </div>
              <div style={{ fontSize: 13, color: COLORS.textMuted }}>
                JPG, PNG, WEBP — road scenes, intersections, traffic footage
              </div>
            </div>
          ) : (
            <div style={{ position: "relative", display: "inline-block", width: "100%" }}>
              <img
                ref={imgRef}
                src={imageDataUrl}
                alt="Traffic scene"
                style={{ width: "100%", maxHeight: 480, objectFit: "contain", display: "block", borderRadius: 14 }}
              />
              {/* Overlay detection badges */}
              {analyzed && detections.map((d, i) => (
                <SignalBadge key={i} state={d.state} confidence={d.confidence} x={d.x_percent} y={d.y_percent} />
              ))}
              {/* Replace button */}
              <button
                onClick={(e) => { e.stopPropagation(); fileRef.current.click(); }}
                style={{
                  position: "absolute", top: 12, right: 12,
                  background: "rgba(0,0,0,0.7)", border: `1px solid ${COLORS.border}`,
                  color: COLORS.textMuted, borderRadius: 8, padding: "6px 14px",
                  fontSize: 12, cursor: "pointer",
                }}
              >
                Change Image
              </button>
            </div>
          )}
        </div>

        {/* Analyze Button */}
        {imageDataUrl && !loading && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
            <button
              onClick={analyze}
              style={{
                background: `linear-gradient(135deg, ${COLORS.accent}, #818cf8)`,
                color: "#fff", border: "none", borderRadius: 12,
                padding: "14px 48px", fontSize: 15, fontWeight: 700,
                cursor: "pointer", letterSpacing: 0.3,
                boxShadow: `0 4px 20px ${COLORS.accentMuted}`,
                transition: "transform 0.15s",
              }}
              onMouseEnter={e => e.target.style.transform = "scale(1.03)"}
              onMouseLeave={e => e.target.style.transform = "scale(1)"}
            >
              {analyzed ? "Re-Detect" : "Detect Traffic Lights"}
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && <Spinner />}

        {/* Error */}
        {error && (
          <div style={{
            background: "#ef444422", border: `1px solid ${COLORS.red}`,
            borderRadius: 12, padding: "14px 20px", color: COLORS.red,
            fontSize: 13, marginBottom: 20,
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Results */}
        {analyzed && !loading && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>

            {/* Scene Description */}
            {metrics?.sceneDesc && (
              <div style={{
                background: COLORS.surface, border: `1px solid ${COLORS.border}`,
                borderRadius: 12, padding: "14px 20px", marginBottom: 20,
                fontSize: 13, color: COLORS.textMuted,
                borderLeft: `3px solid ${COLORS.accent}`,
              }}>
                <span style={{ color: COLORS.accent, fontWeight: 600 }}>Scene: </span>
                {metrics.sceneDesc}
              </div>
            )}

            {/* Metrics Row */}
            <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
              <MetricCard label="Detections" value={metrics.count} unit="lights" color={COLORS.accent} />
              <MetricCard label="Avg Confidence" value={avgConf} unit="%" color={avgConf > 85 ? COLORS.green : avgConf > 70 ? COLORS.yellow : COLORS.red} />
              <MetricCard label="Inference Time" value={metrics.inferenceMs} unit="ms" />
              <MetricCard label="Conditions" value={metrics.conditions} unit="" color={COLORS.textMuted} />
            </div>

            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>

              {/* Traffic Light Visual + Per-class */}
              <div style={{
                background: COLORS.surface, border: `1px solid ${COLORS.border}`,
                borderRadius: 16, padding: 24, flex: "0 0 280px",
              }}>
                <div style={{ fontSize: 12, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>
                  Signal States
                </div>
                <div style={{ display: "flex", gap: 20, alignItems: "center", marginBottom: 24 }}>
                  <TrafficLightVisual detections={detections} />
                  <div style={{ flex: 1 }}>
                    {[
                      { label: "Red", count: redCount, color: COLORS.red },
                      { label: "Yellow", count: yellowCount, color: COLORS.yellow },
                      { label: "Green", count: greenCount, color: COLORS.green },
                    ].map(({ label, count, color }) => (
                      <div key={label} style={{
                        display: "flex", justifyContent: "space-between",
                        alignItems: "center", marginBottom: 10,
                      }}>
                        <span style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />
                          {label}
                        </span>
                        <span style={{
                          background: count > 0 ? `${color}22` : COLORS.border,
                          border: `1px solid ${count > 0 ? color : "transparent"}`,
                          color: count > 0 ? color : COLORS.textMuted,
                          borderRadius: 6, padding: "2px 10px",
                          fontSize: 13, fontFamily: "monospace", fontWeight: 700,
                        }}>
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Confidence distribution */}
                <div style={{ fontSize: 12, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
                  Class Distribution
                </div>
                <ConfBar label="Red" value={Math.round(redCount / total * 100)} color={COLORS.red} count={redCount} />
                <ConfBar label="Yellow" value={Math.round(yellowCount / total * 100)} color={COLORS.yellow} count={yellowCount} />
                <ConfBar label="Green" value={Math.round(greenCount / total * 100)} color={COLORS.green} count={greenCount} />
              </div>

              {/* Detection List */}
              <div style={{
                background: COLORS.surface, border: `1px solid ${COLORS.border}`,
                borderRadius: 16, padding: 24, flex: 1, minWidth: 260,
              }}>
                <div style={{ fontSize: 12, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>
                  Detection Log
                </div>

                {detections.length === 0 ? (
                  <div style={{ color: COLORS.textMuted, fontSize: 13, padding: "24px 0", textAlign: "center" }}>
                    No traffic lights detected in this image.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {detections.map((d, i) => {
                      const color = d.state === "Red" ? COLORS.red : d.state === "Yellow" ? COLORS.yellow : COLORS.green;
                      const glow = d.state === "Red" ? COLORS.redGlow : d.state === "Yellow" ? COLORS.yellowGlow : COLORS.greenGlow;
                      return (
                        <div key={i} style={{
                          background: COLORS.bg, borderRadius: 10,
                          border: `1px solid ${color}44`,
                          padding: "12px 16px",
                          display: "flex", alignItems: "flex-start", gap: 12,
                        }}>
                          <div style={{
                            width: 14, height: 14, borderRadius: "50%", background: color,
                            boxShadow: `0 0 10px 3px ${glow}`,
                            marginTop: 3, flexShrink: 0,
                          }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontWeight: 700, color, fontSize: 14 }}>{d.state}</span>
                              <span style={{
                                fontFamily: "monospace", fontSize: 12,
                                color: d.confidence >= 85 ? COLORS.green : d.confidence >= 70 ? COLORS.yellow : COLORS.red,
                              }}>
                                {d.confidence}% conf
                              </span>
                            </div>
                            <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 3 }}>{d.description}</div>
                            <div style={{ fontSize: 11, fontFamily: "monospace", color: COLORS.border, marginTop: 4 }}>
                              x:{d.x_percent?.toFixed(1)}% y:{d.y_percent?.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Model Performance Panel */}
              <div style={{
                background: COLORS.surface, border: `1px solid ${COLORS.border}`,
                borderRadius: 16, padding: 24, flex: "0 0 240px",
              }}>
                <div style={{ fontSize: 12, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>
                  Model Performance
                </div>
                {[
                  { label: "mAP@50", value: "92.2%", color: COLORS.green },
                  { label: "mAP@50-95", value: "76.4%", color: COLORS.green },
                  { label: "Precision", value: "90.7%", color: COLORS.green },
                  { label: "Recall", value: "90.0%", color: COLORS.green },
                  { label: "F1-Score", value: "90.4%", color: COLORS.green },
                  { label: "GPU FPS", value: "36.8", color: COLORS.accent },
                  { label: "Inference", value: "7.3ms", color: COLORS.accent },
                  { label: "Params", value: "11.2M", color: COLORS.textMuted },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{
                    display: "flex", justifyContent: "space-between",
                    borderBottom: `1px solid ${COLORS.border}`,
                    padding: "8px 0", fontSize: 13,
                  }}>
                    <span style={{ color: COLORS.textMuted }}>{label}</span>
                    <span style={{ fontFamily: "monospace", fontWeight: 600, color }}>{value}</span>
                  </div>
                ))}

                <div style={{ marginTop: 16, fontSize: 11, color: COLORS.textMuted, lineHeight: 1.6 }}>
                  Trained on LISA + Roboflow dataset. YOLOv8s anchor-free architecture. Transfer learning from COCO weights.
                </div>
              </div>
            </div>

            {/* Class Performance Table */}
            <div style={{
              marginTop: 20,
              background: COLORS.surface, border: `1px solid ${COLORS.border}`,
              borderRadius: 16, padding: 24,
            }}>
              <div style={{ fontSize: 12, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>
                Per-Class Evaluation (Test Set Results — Chapter 7)
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                      {["Class", "Precision", "Recall", "F1-Score", "AP@50"].map(h => (
                        <th key={h} style={{ padding: "8px 12px", textAlign: h === "Class" ? "left" : "right", color: COLORS.textMuted, fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { cls: "Red", color: COLORS.red, p: "92.3%", r: "91.8%", f1: "92.0%", ap: "93.5%" },
                      { cls: "Yellow", color: COLORS.yellow, p: "88.1%", r: "87.4%", f1: "87.7%", ap: "90.2%" },
                      { cls: "Green", color: COLORS.green, p: "91.7%", r: "90.9%", f1: "91.3%", ap: "92.8%" },
                    ].map(({ cls, color, p, r, f1, ap }) => (
                      <tr key={cls} style={{ borderBottom: `1px solid ${COLORS.border}22` }}>
                        <td style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, boxShadow: `0 0 6px ${color}` }} />
                          <span style={{ color: COLORS.textPrimary }}>{cls}</span>
                        </td>
                        {[p, r, f1, ap].map((v, i) => (
                          <td key={i} style={{ padding: "10px 12px", textAlign: "right", fontFamily: "monospace", color }}>{v}</td>
                        ))}
                      </tr>
                    ))}
                    <tr style={{ borderTop: `1px solid ${COLORS.border}` }}>
                      <td style={{ padding: "10px 12px", color: COLORS.textMuted, fontStyle: "italic" }}>Overall</td>
                      {["—", "—", "—", "92.2%"].map((v, i) => (
                        <td key={i} style={{ padding: "10px 12px", textAlign: "right", fontFamily: "monospace", color: COLORS.accent, fontWeight: 700 }}>{v}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* Empty state hint */}
        {!imageDataUrl && (
          <div style={{ textAlign: "center", padding: "20px 0", color: COLORS.textMuted, fontSize: 13 }}>
            Upload a traffic scene image to detect and classify signal states using AI
          </div>
        )}

      </div>
    </div>
  );
}
