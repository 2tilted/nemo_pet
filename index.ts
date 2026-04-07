export const MOOD_FRAMES = {
  idle: [
    [`  /\\___/\\  `, `=( o w o )=`, `  (m) (m)  `],
    [`  /\\___/\\  `, `≈( o w o )≈`, `  (m) (m)  `],
    [`  /\\___/\\  `, `=( - w - )=`, `  (m) (m)  `],
    [`  /\\___/\\  `, `≈( o w o )≈`, `  (m) (m)  `],
    [`  /\\___/|  `, `=( o w o )=`, `  (m) (m)  `],
    [`  /\\___/\\  `, `≈( o w o )≈`, `  (m) (m)  `],
    [`  /\\___/\\  `, `=( o w o )=`, `  (m) (m)  `],
    [`  |\\___/\\  `, `≈( o w o )≈`, `  (m) (m)  `],
    [`  /\\___/\\  `, `=( o w o )=`, `  (m) (m)  `],
    // Paws appear!
    [`  /\\___/\\  `, `≈( o w o )≈`, `  (m) (m)  `],
    [`  /\\___/\\  `, `=( o w o )=`, `  (m) (m)  `],
    [`  /\\___/\\  `, `≈( o w o )≈`, `           `]
  ],
  happy: [
    [`  /\\___/\\  `, `=( ^ W ^ )=`, ` \\(m) (m)/ `],
    [`  /\\___/\\  `, `≈( ^ w ^ )≈`, ` \\(m) (m)/ `]
  ],
  sleeping: [
    [`  /\\___/\\ z`, `=( - . - )=`, `  (m)_(m)  `],
    [`  /\\___/\\ z`, `=( - . - )=`, `  (m)_(m)  `],
    [`  /\\___/\\ Z`, `≈( - . - )≈`, `  (m)_(m)  `],
    [`  /\\___/\\ Z`, `≈( - . - )≈`, `  (m)_(m)  `]
  ],
  playing: [
    [`  /\\___/\\  `, `=( O w o )=`, `  (m)      `],
    [`  /\\___/\\  `, `≈( o w O )≈`, `      (m)  `]
  ],
  cleaning: [
    [`  /\\___/\\  `, `=( - p - )=`, `  (m)      `],
    [`  /\\___/\\  `, `≈( - q - )≈`, `   (m)     `]
  ],
  eating: [
    [`  /\\___/\\  `, `=( ^ O ^ )=`, `  (m) (m)  `],
    [`  /\\___/\\  `, `≈( ^ o ^ )≈`, `  (m) (m)  `],
    [`  /\\___/\\  `, `=( ^ - ^ )=`, `  (m) (m)  `]
  ]
};
export class NemoComponent {
  constructor() {
    this._state = { mood: "idle", frameIndex: 0 };
  }
  get state() {
    return this._state;
  }
  setMood(mood) {
    if (this._state.mood !== mood) {
      this._state.mood = mood;
      this._state.frameIndex = 0;
    }
  }
  advanceFrame() {
    const frames = MOOD_FRAMES[this._state.mood] || MOOD_FRAMES["idle"];
    this._state.frameIndex = (this._state.frameIndex + 1) % frames.length;
  }
  render() {
    const orange = "\x1B[38;5;208m";
    const reset = "\x1B[0m";
    const frames = MOOD_FRAMES[this._state.mood] || MOOD_FRAMES["idle"];
    const frame = frames[this._state.frameIndex] || frames[0];
    return frame.map((line) => `${orange}${line}${reset}`);
  }
  // Helper for the web preview
  renderPlain() {
    const frames = MOOD_FRAMES[this._state.mood] || MOOD_FRAMES["idle"];
    const frame = frames[this._state.frameIndex] || frames[0];
    return frame.join("\n");
  }
}
export default function(pi) {
  let nemo = null;
  let animInterval = null;
  let idleTimer = null;
  pi.on("session_start", async (_event, ctx) => {
    nemo = new NemoComponent();
    const updateWidget = () => {
      if (!nemo) return;
      ctx.ui.setWidget("nemo-cat", () => ({
        render: () => nemo.render(),
        invalidate: () => {
        }
      }), { placement: "belowEditor" });
    };
    updateWidget();
    animInterval = setInterval(() => {
      if (nemo) {
        nemo.advanceFrame();
        updateWidget();
      }
    }, 350);
    const resetIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      if (nemo?.state.mood === "sleeping") nemo.setMood("idle");
      idleTimer = setTimeout(() => nemo?.setMood("sleeping"), 3e4);
    };
    const startWorking = () => {
      nemo?.setMood("playing");
      resetIdleTimer();
    };
    pi.on("agent_start", startWorking);
    pi.on("tool_call_start", startWorking);
    pi.on("step_start", startWorking);
    const stopWorking = () => {
      nemo?.setMood("happy");
      setTimeout(() => {
        if (nemo?.state.mood === "happy") nemo?.setMood("idle");
      }, 3e3);
    };
    pi.on("agent_end", stopWorking);
    pi.on("tool_call_end", stopWorking);
    pi.on("step_end", stopWorking);
    let typingTimeout = null;
    const handleTyping = () => {
      nemo?.setMood("eating");
      if (typingTimeout) clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => {
        if (nemo?.state.mood === "eating") nemo?.setMood("idle");
      }, 1e3);
      resetIdleTimer();
    };
    pi.on("user_typing", handleTyping);
    pi.on("user_input", handleTyping);
    pi.on("input_start", handleTyping);
    const startCompacting = () => {
      nemo?.setMood("cleaning");
      resetIdleTimer();
    };
    pi.on("context_compaction_start", startCompacting);
    pi.on("context_compact", startCompacting);
    pi.on("compaction_start", startCompacting);
    const stopCompacting = () => {
      nemo?.setMood("happy");
      setTimeout(() => {
        if (nemo?.state.mood === "happy") nemo?.setMood("idle");
      }, 3e3);
    };
    pi.on("context_compaction_end", stopCompacting);
    pi.on("compaction_end", stopCompacting);
    resetIdleTimer();
  });
  pi.on("session_end", () => {
    if (animInterval) clearInterval(animInterval);
    if (idleTimer) clearTimeout(idleTimer);
  });
}