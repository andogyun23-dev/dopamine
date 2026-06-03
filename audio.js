/**
 * Dopamine Dystopia: Focus Defense - Procedural Audio Controller
 * Uses Web Audio API to synthesize sounds and music in real time.
 */

class AudioController {
    constructor() {
        this.ctx = null;
        this.masterVolume = null;
        this.filterNode = null;
        this.distortionNode = null;
        
        this.isInitialized = false;
        this.isMuted = false;
        this.isPlaying = false;
        
        // Music scheduler variables
        this.schedulerTimer = null;
        this.bpm = 100;
        this.nextNoteTime = 0.0;
        this.currentNote = 0;
        this.lookahead = 25.0; // ms
        this.scheduleAheadTime = 0.1; // seconds
        
        // Music state
        // Dynamic A-minor cybernetic sequence
        this.bassSequence = [
            55.00, 55.00, 65.41, 65.41, // A1, A1, C2, C2
            73.42, 73.42, 82.41, 98.00, // D2, D2, E2, G2
            55.00, 55.00, 110.00, 98.00, // A1, A1, A2, G2
            82.41, 73.42, 65.41, 58.27   // E2, D2, C2, A#1
        ];
        this.leadSequence = [
            220.00, 261.63, 329.63, 392.00,
            440.00, 392.00, 329.63, 261.63,
            220.00, 329.63, 440.00, 523.25,
            659.25, 587.33, 440.00, 392.00
        ];
    }

    init() {
        if (this.isInitialized) return;
        
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContextClass();
            
            // Nodes setup: Source -> Distortion -> LPF Filter -> Master Volume -> Destination
            this.masterVolume = this.ctx.createGain();
            this.masterVolume.gain.setValueAtTime(0.15, this.ctx.currentTime); // Standard safe volume
            
            this.filterNode = this.ctx.createBiquadFilter();
            this.filterNode.type = 'lowpass';
            this.filterNode.frequency.setValueAtTime(800, this.ctx.currentTime); // Starts a bit warm/low-pass filtered
            this.filterNode.Q.setValueAtTime(1.5, this.ctx.currentTime);
            
            this.distortionNode = this.ctx.createWaveShaper();
            this.distortionNode.curve = this.makeDistortionCurve(0); // Starts clean
            this.distortionNode.oversample = '4x';
            
            // Connect chain
            this.distortionNode.connect(this.filterNode);
            this.filterNode.connect(this.masterVolume);
            this.masterVolume.connect(this.ctx.destination);
            
            this.isInitialized = true;
            console.log("Audio System Initialized successfully.");
        } catch (e) {
            console.error("Failed to initialize Web Audio API:", e);
        }
    }

    makeDistortionCurve(amount) {
        const k = typeof amount === 'number' ? amount : 50;
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        const deg = Math.PI / 180;
        for (let i = 0; i < n_samples; ++i) {
            const x = (i * 2) / n_samples - 1;
            curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
        }
        return curve;
    }

    toggleMute() {
        if (!this.isInitialized) this.init();
        
        this.isMuted = !this.isMuted;
        if (this.masterVolume) {
            this.masterVolume.gain.setValueAtTime(this.isMuted ? 0 : 0.15, this.ctx.currentTime);
        }
        return this.isMuted;
    }

    startMusic() {
        if (!this.isInitialized) this.init();
        if (this.isPlaying) return;
        
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        
        this.isPlaying = true;
        this.currentNote = 0;
        this.nextNoteTime = this.ctx.currentTime;
        this.scheduler();
    }

    stopMusic() {
        this.isPlaying = false;
        if (this.schedulerTimer) {
            clearTimeout(this.schedulerTimer);
            this.schedulerTimer = null;
        }
    }

    scheduler() {
        if (!this.isPlaying) return;
        
        while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
            this.scheduleNote(this.currentNote, this.nextNoteTime);
            this.nextNote();
        }
        
        this.schedulerTimer = setTimeout(() => this.scheduler(), this.lookahead);
    }

    nextNote() {
        const secondsPerBeat = 60.0 / this.bpm;
        // Schedule notes as 1/16th notes (4 notes per beat)
        this.nextNoteTime += 0.25 * secondsPerBeat;
        this.currentNote = (this.currentNote + 1) % 16;
    }

    scheduleNote(noteIndex, time) {
        if (!this.isInitialized || this.isMuted) return;

        // Bass Synth Oscillator
        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(this.bassSequence[noteIndex], time);
        
        // Fast decay envelope for nice electronic beat
        gain1.gain.setValueAtTime(0.3, time);
        gain1.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
        
        osc1.connect(gain1);
        gain1.connect(this.distortionNode);
        
        osc1.start(time);
        osc1.stop(time + 0.18);
        
        // Every 4 beats, play a sharp cyberpunk high-hat noise
        if (noteIndex % 4 === 0) {
            this.playProceduralHighHat(time);
        }

        // Add a melodic lead arpeggio when attention is high or normal
        // Less frequent, but matching rhythm
        if (noteIndex % 2 === 0 && Math.random() > 0.3) {
            const osc2 = this.ctx.createOscillator();
            const gain2 = this.ctx.createGain();
            
            // Choose waveform based on distraction state
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(this.leadSequence[noteIndex], time);
            
            gain2.gain.setValueAtTime(0.12, time);
            gain2.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
            
            osc2.connect(gain2);
            gain2.connect(this.distortionNode);
            
            osc2.start(time);
            osc2.stop(time + 0.3);
        }
    }

    playProceduralHighHat(time) {
        // Create noise buffer
        const bufferSize = this.ctx.sampleRate * 0.05; // 50ms hi-hat noise
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noiseNode = this.ctx.createBufferSource();
        noiseNode.buffer = buffer;

        // Bandpass filter to make it hiss like a hi-hat
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 8000;
        filter.Q.value = 3.0;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.1, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

        noiseNode.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterVolume); // bypass main lowpass filter to sound crisp

        noiseNode.start(time);
        noiseNode.stop(time + 0.05);
    }

    updateTempoAndTone(mentalGauge, score) {
        if (!this.isInitialized) return;
        
        // Calculate variables based on mental health & score
        // mentalGauge: 100 -> 0. score increases difficulty
        const distress = (100 - mentalGauge) / 100; // 0.0 to 1.0
        
        // 1. Accelerate tempo: 100 BPM -> 180 BPM
        this.bpm = 100 + distress * 80;
        
        // 2. Open/Close filter:
        // As distress increases, open lowpass filter to let harsh frequencies through (make it louder/harsher)
        const filterFreq = 600 + distress * 3400; // 600Hz -> 4000Hz
        this.filterNode.frequency.setTargetAtTime(filterFreq, this.ctx.currentTime, 0.2);
        
        // 3. Add heavy distortion as user gets overwhelmed
        const distAmt = distress * 60; // 0 to 60 distortion factor
        this.distortionNode.curve = this.makeDistortionCurve(distAmt);
    }

    playBlockSFX() {
        if (!this.isInitialized || this.isMuted) return;
        
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        // Clean laser sweep up representing success
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08);
        
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        
        osc.connect(gain);
        gain.connect(this.masterVolume);
        
        osc.start(now);
        osc.stop(now + 0.11);
    }

    playHitSFX() {
        if (!this.isInitialized || this.isMuted) return;
        
        const now = this.ctx.currentTime;
        
        // Bass drop hit
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
        
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.35);
        
        // Filter sweep down to give it punch
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, now);
        filter.frequency.exponentialRampToValueAtTime(60, now + 0.35);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterVolume);
        
        osc.start(now);
        osc.stop(now + 0.36);
        
        // Parallel glitch pitch oscillator (creates dissonance)
        const glitchOsc = this.ctx.createOscillator();
        const glitchGain = this.ctx.createGain();
        glitchOsc.type = 'square';
        glitchOsc.frequency.setValueAtTime(220, now);
        glitchOsc.frequency.setValueAtTime(80, now + 0.08);
        glitchOsc.frequency.setValueAtTime(350, now + 0.15);
        
        glitchGain.gain.setValueAtTime(0.08, now);
        glitchGain.gain.linearRampToValueAtTime(0.001, now + 0.22);
        
        glitchOsc.connect(glitchGain);
        glitchGain.connect(this.masterVolume);
        
        glitchOsc.start(now);
        glitchOsc.stop(now + 0.23);
    }

    playGameOverSFX() {
        if (!this.isInitialized || this.isMuted) return;
        
        const now = this.ctx.currentTime;
        const duration = 1.8;
        
        // Decelerating drone
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(90, now);
        osc.frequency.linearRampToValueAtTime(15, now + duration);
        
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        
        // Harsh filter sweep
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, now);
        filter.frequency.linearRampToValueAtTime(30, now + duration);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterVolume);
        
        osc.start(now);
        osc.stop(now + duration + 0.1);
    }
}

// Global single instance export
const audio = new AudioController();
window.audioSystem = audio;
