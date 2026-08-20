import pptxgen from "pptxgenjs";

const pptx = new pptxgen();

// Global Deck Settings
pptx.layout = "LAYOUT_16x9";
pptx.author = "Industrial Safety Team";
pptx.company = "Lone Worker Guardian";
pptx.title = "Lone Worker Guardian Presentation";

// Color Palette Definition
const BG_DARK = "0F172A";
const CARD_BG = "1E293B";
const ACCENT_CYAN = "38BDF8";
const ACCENT_RED = "F43F5E";
const TEXT_WHITE = "F8FAFC";
const TEXT_MUTED = "94A3B8";

// ================= SLIDE 1: Title Slide =================
const slide1 = pptx.addSlide();
slide1.background = { color: BG_DARK };

slide1.addText("LONE WORKER GUARDIAN", {
  x: 0.8, y: 1.8, w: 11.5, h: 1.0,
  fontSize: 40, bold: true, color: ACCENT_CYAN, fontFace: "Arial"
});

slide1.addText("Automated Fall Detection & Real-Time Emergency Dispatch System", {
  x: 0.8, y: 2.8, w: 11.5, h: 0.6,
  fontSize: 20, color: TEXT_WHITE, fontFace: "Arial"
});

slide1.addText("Domain: Industrial IoT | Real-Time Systems | Worker Safety", {
  x: 0.8, y: 5.5, w: 11.5, h: 0.5,
  fontSize: 14, color: TEXT_MUTED, fontFace: "Arial"
});

// ================= SLIDE 2: Existing vs Proposed =================
const slide2 = pptx.addSlide();
slide2.background = { color: BG_DARK };

slide2.addText("Existing System vs. Proposed System", {
  x: 0.8, y: 0.6, w: 11.5, h: 0.6,
  fontSize: 28, bold: true, color: ACCENT_CYAN
});

const tableRows = [
  [
    { text: "Feature / Parameter", options: { bold: true, color: TEXT_WHITE, fill: "334155" } },
    { text: "Existing System", options: { bold: true, color: ACCENT_RED, fill: "334155" } },
    { text: "Proposed System (Guardian)", options: { bold: true, color: "22C55E", fill: "334155" } }
  ],
  [
    { text: "Response Time", options: { color: TEXT_WHITE, fill: CARD_BG } },
    { text: "30+ mins delay (Manual phone calls)", options: { color: TEXT_MUTED, fill: CARD_BG } },
    { text: "< 2 seconds (Instant WebSockets & SMS)", options: { color: TEXT_WHITE, fill: CARD_BG } }
  ],
  [
    { text: "Fall Detection", options: { color: TEXT_WHITE, fill: CARD_BG } },
    { text: "Manual radio check-in only", options: { color: TEXT_MUTED, fill: CARD_BG } },
    { text: "Automatic 3-Axis Motion Sensor API", options: { color: TEXT_WHITE, fill: CARD_BG } }
  ],
  [
    { text: "GPS Positioning", options: { color: TEXT_WHITE, fill: CARD_BG } },
    { text: "Coarse cell tower estimation", options: { color: TEXT_MUTED, fill: CARD_BG } },
    { text: "Hardware GPS + Network IP Fallback", options: { color: TEXT_WHITE, fill: CARD_BG } }
  ],
  [
    { text: "Owner Tracking", options: { color: TEXT_WHITE, fill: CARD_BG } },
    { text: "Static logbooks or manual reports", options: { color: TEXT_MUTED, fill: CARD_BG } },
    { text: "Live Command Center + Google Maps Pin", options: { color: TEXT_WHITE, fill: CARD_BG } }
  ]
];

slide2.addTable(tableRows, {
  x: 0.8, y: 1.5, w: 11.5,
  colW: [2.5, 4.5, 4.5],
  border: { pt: 1, color: "475569" },
  fontFace: "Arial",
  fontSize: 13
});

// ================= SLIDE 3: System Architecture =================
const slide3 = pptx.addSlide();
slide3.background = { color: BG_DARK };

slide3.addText("System Architecture & Workflow", {
  x: 0.8, y: 0.6, w: 11.5, h: 0.6,
  fontSize: 28, bold: true, color: ACCENT_CYAN
});

const modules = [
  { title: "1. Edge Sensing Layer", desc: "Tracks device motion via devicemotion APIs to detect sudden fall impacts (>25 m/s²)." },
  { title: "2. Emergency Dispatch Logic", desc: "Synthesizes local audio sirens, triggers vibrations, and locks live GPS coordinates." },
  { title: "3. WebSocket Data Pipeline", desc: "Broadcasts JSON alerts instantly across Socket.io persistent channels to servers." },
  { title: "4. Owner Command Center", desc: "Receives push alerts, flashes dashboard, and generates Google Maps navigation pins." }
];

modules.forEach((mod, index) => {
  const xPos = 0.8 + (index % 2) * 5.8;
  const yPos = 1.6 + Math.floor(index / 2) * 2.5;

  slide3.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: xPos, y: yPos, w: 5.4, h: 2.1,
    fill: { color: CARD_BG }, line: { color: ACCENT_CYAN, width: 1 }
  });

  slide3.addText(mod.title, {
    x: xPos + 0.2, y: yPos + 0.3, w: 5.0, h: 0.4,
    fontSize: 16, bold: true, color: ACCENT_CYAN
  });

  slide3.addText(mod.desc, {
    x: xPos + 0.2, y: yPos + 0.8, w: 5.0, h: 1.1,
    fontSize: 13, color: TEXT_MUTED
  });
});

// ================= SLIDE 4: Technology Stack =================
const slide4 = pptx.addSlide();
slide4.background = { color: BG_DARK };

slide4.addText("Technology Stack", {
  x: 0.8, y: 0.6, w: 11.5, h: 0.6,
  fontSize: 28, bold: true, color: ACCENT_CYAN
});

const stack = [
  { cat: "Frontend UI", tech: "React.js, HTML5 Motion API, Web Audio API (Synthesizer Siren)" },
  { cat: "Real-Time Engine", tech: "Socket.io (Bi-directional WebSocket Communication)" },
  { cat: "Backend Server", tech: "Node.js, Express.js REST APIs" },
  { cat: "Gateway & Maps", tech: "Twilio SMS API, Google Maps Navigation Pin Integration" }
];

stack.forEach((item, idx) => {
  slide4.addShape(pptx.shapes.RECTANGLE, {
    x: 0.8, y: 1.5 + idx * 1.2, w: 11.5, h: 0.9,
    fill: { color: CARD_BG }, line: { color: "334155", width: 1 }
  });

  slide4.addText(item.cat, {
    x: 1.0, y: 1.65 + idx * 1.2, w: 3.5, h: 0.6,
    fontSize: 16, bold: true, color: ACCENT_RED
  });

  slide4.addText(item.tech, {
    x: 4.5, y: 1.65 + idx * 1.2, w: 7.5, h: 0.6,
    fontSize: 14, color: TEXT_WHITE
  });
});

// Save Presentation
pptx.writeFile({ fileName: "Lone_Worker_Guardian_Presentation.pptx" })
  .then((fileName) => {
    console.log(`✅ PowerPoint successfully generated: ${fileName}`);
  })
  .catch((err) => {
    console.error("Error generating PPT:", err);
  });