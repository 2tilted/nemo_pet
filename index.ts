export const MOOD_FRAMES = {
  idle: [
    [`  /\\___/\\  `, `=( o w o )=`, ` /       \\ `],
    [`  /\\___/\\  `, `≈( o w o )≈`, ` /       \\ `],
    [`  /\\___/\\  `, `=( - w - )=`, ` /       \\ `],
    [`  /\\___/\\  `, `≈( o w o )≈`, ` /       \\ `],
    [`  /\\___/|  `, `=( o w o )=`, ` /       \\ `],
    [`  /\\___/\\  `, `≈( o w o )≈`, ` /       \\ `],
    [`  /\\___/\\  `, `=( o w o )=`, ` /       \\ `],
    [`  |\\___/\\  `, `≈( o w o )≈`, ` /       \\ `]
  ],
  happy: [
    [`  /\\___/\\  `, `=( ^ W ^ )=`, ` / (m)(m)\\`],
    [`  /\\___/\\  `, `≈( ^ w ^ )≈`, ` /(m)(m) \\`]
  ],
  sleeping: [
    [`  /\\___/\\ z`, `=( - . - )=`, `  (m)_(m)  `],
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
    [`  /\\___/\\  `, `≈( ^ o ^ )≈`, `  (m) (m)  `]
  ]
};

export class NemoComponent {
  private _state = { mood: "idle", frameIndex: 0 };
  public isCompacting = false;
  public isAgentActive = false; // Track if a task is currently running

  get state() { return this._state; }

  setMood(mood: string, force: boolean = false) {
    // 1. Compaction is the highest priority
    if (this.isCompacting && !force) return;

    // 2. If Agent is active, don't allow "sleeping" or "idle" to override "playing"
    if (this.isAgentActive && (mood === "sleeping" || mood === "idle") && !force) return;

    if (this._state.mood !== mood) {
      this._state.mood = mood;
      this._state.frameIndex = 0;
    }
  }

  advanceFrame() {
    const moodKey = this._state.mood as keyof typeof MOOD_FRAMES;
    const frames = MOOD_FRAMES[moodKey] || MOOD_FRAMES.idle;
    this._state.frameIndex = (this._state.frameIndex + 1) % frames.length;
  }

  render(): string[] {
    const orange = "\x1B[38;5;208m";
    const reset = "\x1B[0m";
    const moodKey = this._state.mood as keyof typeof MOOD_FRAMES;
    const frames = MOOD_FRAMES[moodKey] || MOOD_FRAMES.idle;
    const frame = frames[this._state.frameIndex] || frames[0];
    return frame.map((line) => `${orange}${line}${reset}`);
  }
}

export default function (pi: any) {
  let nemo: NemoComponent | null = null;
  let animInterval: any = null;
  let idleTimer: any = null;
  let happyTransitionTimer: any = null;

  pi.on("session_start", async (_event: any, ctx: any) => {
    nemo = new NemoComponent();

    const updateWidget = () => {
      if (!nemo) return;
      ctx.ui.setWidget("nemo-cat", () => ({
        render: () => nemo!.render(),
        invalidate: () => { }
      }), { placement: "aboveEditor", alignment: "right" });
    };

    animInterval = setInterval(() => {
      if (nemo) {
        nemo.advanceFrame();
        updateWidget();
      }
    }, 350);

    const resetIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);

      // If we move while sleeping, wake up
      if (nemo?.state.mood === "sleeping") {
        nemo.setMood("idle");
      }

      idleTimer = setTimeout(() => {
        // Only go to sleep if we are NOT busy with an agent task or compaction
        if (nemo && !nemo.isCompacting && !nemo.isAgentActive) {
          nemo.setMood("sleeping");
        } else {
          // If we were busy, check again in 30s instead of falling asleep
          resetIdleTimer();
        }
      }, 30000);
    };

    const stopAction = () => {
      if (!nemo) return;
      // If an agent task ended, but another is still technically active, don't go happy yet
      if (nemo.isAgentActive) return;

      nemo.setMood("happy");

      if (happyTransitionTimer) clearTimeout(happyTransitionTimer);
      happyTransitionTimer = setTimeout(() => {
        if (nemo?.state.mood === "happy") {
          nemo.setMood("idle");
        }
      }, 3000);
    };

    // --- Compaction Overrides ---
    pi.on("session_before_compact", () => {
      if (!nemo) return;
      nemo.isCompacting = true;
      nemo.setMood("cleaning", true);
      updateWidget();
    });

    pi.on("session_compact", () => {
      if (!nemo) return;
      nemo.isCompacting = false;
      stopAction();
      resetIdleTimer();
    });

    // --- Agent Activity (Playing) ---
    // We use agent_start/end as the primary "Busy" signal
    pi.on("agent_start", () => {
      if (!nemo) return;
      nemo.isAgentActive = true;
      nemo.setMood("playing");
      resetIdleTimer();
    });

    pi.on("agent_end", () => {
      if (!nemo) return;
      nemo.isAgentActive = false;
      stopAction();
    });

    // These sub-events ensure the cat stays in "playing" mood during long tool calls
    pi.on("tool_call_start", () => {
      if (nemo) nemo.isAgentActive = true;
      nemo?.setMood("playing");
      resetIdleTimer();
    });

    pi.on("step_start", () => {
      if (nemo) nemo.isAgentActive = true;
      nemo?.setMood("playing");
      resetIdleTimer();
    });

    // --- Typing behavior ---
    const handleTyping = () => {
      if (nemo && !nemo.isAgentActive) {
        nemo.setMood("eating");
      }
      resetIdleTimer();

      // Return to idle shortly after typing stops if not busy
      setTimeout(() => {
        if (nemo?.state.mood === "eating" && !nemo.isAgentActive) {
           nemo.setMood("idle");
        }
      }, 2000);
    };

    pi.on("user_typing", handleTyping);
    pi.on("user_input", handleTyping);

    // Initial State
    resetIdleTimer();
    updateWidget();
  });

  pi.on("session_end", () => {
    if (animInterval) clearInterval(animInterval);
    if (idleTimer) clearTimeout(idleTimer);
    if (happyTransitionTimer) clearTimeout(happyTransitionTimer);
  });
}
