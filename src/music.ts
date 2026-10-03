/** An original, quiet pentatonic music-box loop, synthesized entirely on device. */
export function createGroveMusic() {
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  let echo: DelayNode | null = null;
  let timer: ReturnType<typeof setInterval> | undefined;
  let playing = false;
  let disposed = false;
  let revision = 0;
  let step = 0;
  let nextNote = 0;
  const voices = new Set<OscillatorNode>();
  const beat = 60 / 76;
  // Four phrases over C6, Am7, Fmaj7 and Gsus: no recordings or network requests.
  const melody = [76, 79, 81, 79, 74, -1, 72, 74, 76, 72, 69, -1, 72, 76, 79, -1,
    77, 79, 81, -1, 79, 77, 76, 72, 74, 79, 76, -1, 74, 72, -1, -1];
  const chords = [[48, 55, 64], [45, 52, 60], [41, 48, 57], [43, 50, 62]];

  function tone(midi: number, at: number, duration: number, volume: number, bell = false) {
    if (!context || !master) return;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = bell ? "sine" : "triangle";
    oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(volume, at + (bell ? .025 : .35));
    envelope.gain.exponentialRampToValueAtTime(.0001, at + duration);
    oscillator.connect(envelope);
    envelope.connect(master);
    if (bell && echo) envelope.connect(echo);
    voices.add(oscillator);
    oscillator.onended = () => { voices.delete(oscillator); oscillator.disconnect(); envelope.disconnect(); };
    oscillator.start(at);
    oscillator.stop(at + duration + .03);
  }

  function schedule() {
    if (!context || !playing || document.hidden || context.state !== "running") return;
    // A suspended tab never schedules a backlog on return.
    if (nextNote < context.currentTime) nextNote = context.currentTime + .04;
    while (nextNote < context.currentTime + .18) {
      const note = melody[step % melody.length];
      if (note >= 0) {
        tone(note, nextNote, 1.5, .24, true);
        tone(note + 12, nextNote, .65, .022, true);
      }
      if (step % 8 === 0) chords[Math.floor(step / 8) % 4].forEach(n => tone(n, nextNote, beat * 3.7, .055));
      nextNote += beat / 2;
      step++;
    }
  }

  function silence() {
    if (!context || !master) return;
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.setTargetAtTime(0, context.currentTime, .025);
    for (const voice of voices) {
      try { voice.stop(context.currentTime + .12); } catch { /* Already ended. */ }
    }
  }

  const visibility = () => {
    if (!context || !playing || disposed) return;
    if (document.hidden) {
      silence();
    } else {
      const attempt = revision;
      void context.resume().then(() => {
        if (!playing || disposed || attempt !== revision || !context || !master) return;
        nextNote = context.currentTime + .06;
        master.gain.setTargetAtTime(.3, context.currentTime, .15);
        schedule();
      }).catch(() => { /* The next explicit music toggle can restore audio. */ });
    }
  };
  document.addEventListener("visibilitychange", visibility);

  return {
    async start() {
      if (disposed) throw new Error("Music is closed");
      const attempt = ++revision;
      if (!context) {
        const Audio = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Audio) throw new Error("Web Audio is unavailable");
        context = new Audio();
        master = context.createGain();
        master.gain.value = 0;
        const compressor = context.createDynamicsCompressor();
        compressor.threshold.value = -18;
        compressor.ratio.value = 3;
        master.connect(compressor);
        compressor.connect(context.destination);
        echo = context.createDelay(1);
        echo.delayTime.value = beat * .75;
        const echoLevel = context.createGain();
        echoLevel.gain.value = .18;
        echo.connect(echoLevel);
        echoLevel.connect(master);
      }
      await context.resume();
      if (disposed || attempt !== revision) return;
      if (context.state !== "running") throw new Error("Audio could not start");
      playing = true;
      nextNote = context.currentTime + .06;
      master!.gain.cancelScheduledValues(context.currentTime);
      master!.gain.setTargetAtTime(.3, context.currentTime, .15);
      if (timer) clearInterval(timer);
      timer = setInterval(schedule, 60);
      schedule();
    },
    stop() {
      revision++;
      playing = false;
      if (timer) clearInterval(timer);
      timer = undefined;
      silence();
    },
    dispose() {
      this.stop();
      disposed = true;
      document.removeEventListener("visibilitychange", visibility);
      void context?.close().catch(() => {});
      context = null;
    },
  };
}
