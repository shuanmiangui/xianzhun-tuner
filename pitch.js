/*
 * Stringwise pitch detector.
 * A compact YIN implementation tuned for the range of a guitar
 * (plus a little headroom for bends and higher positions).
 *
 * The detector is deliberately independent from the UI so it can also be
 * exercised in Node with synthetic signals.
 */
(function (global) {
  'use strict';

  class PitchDetector {
    constructor(sampleRate, options) {
      options = options || {};
      this.sampleRate = sampleRate;
      this.minFreq = options.minFreq || 55;
      this.maxFreq = options.maxFreq || 1200;
      this.silenceRms = options.silenceRms || 0.00115;
      this.threshold = options.threshold || 0.16;
      this.maxAcceptableAperiodicity = 0.23;

      // Working at ~22 kHz keeps the maths light on phones without harming
      // the resolution we need for a guitar's lowest string.
      this.factor = Math.max(1, Math.round(sampleRate / 22050));
      this.workRate = sampleRate / this.factor;
      this.bufferSize = options.bufferSize || 4096;
      this.workLength = Math.max(1024, Math.floor(this.bufferSize / this.factor));
      this.tauMin = Math.max(2, Math.floor(this.workRate / this.maxFreq));
      this.tauMax = Math.min(
        Math.floor(this.workRate / this.minFreq),
        Math.floor(this.workLength * 0.48)
      );

      this.work = new Float32Array(this.workLength);
      this.difference = new Float32Array(this.tauMax + 2);
      this.cmnd = new Float32Array(this.tauMax + 2);
    }

    setBufferSize(bufferSize, sampleRate) {
      if (sampleRate && sampleRate !== this.sampleRate) {
        this.sampleRate = sampleRate;
        this.factor = Math.max(1, Math.round(sampleRate / 22050));
        this.workRate = sampleRate / this.factor;
      }
      this.bufferSize = bufferSize;
      this.workLength = Math.max(1024, Math.floor(bufferSize / this.factor));
      this.tauMin = Math.max(2, Math.floor(this.workRate / this.maxFreq));
      this.tauMax = Math.min(
        Math.floor(this.workRate / this.minFreq),
        Math.floor(this.workLength * 0.48)
      );
      this.work = new Float32Array(this.workLength);
      this.difference = new Float32Array(this.tauMax + 2);
      this.cmnd = new Float32Array(this.tauMax + 2);
    }

    detect(input) {
      if (!input || input.length < 1024) {
        return { frequency: null, clarity: 0, rms: 0 };
      }

      const factor = this.factor;
      const workLength = Math.min(this.workLength, Math.floor(input.length / factor));
      const work = this.work;

      let sum = 0;
      for (let i = 0; i < workLength; i++) {
        let value = 0;
        const start = i * factor;
        for (let j = 0; j < factor; j++) {
          value += input[start + j];
        }
        value /= factor;
        work[i] = value;
        sum += value;
      }

      const mean = sum / workLength;
      let sumSquares = 0;
      for (let i = 0; i < workLength; i++) {
        const centered = work[i] - mean;
        work[i] = centered;
        sumSquares += centered * centered;
      }

      const rms = Math.sqrt(sumSquares / workLength);
      if (rms < this.silenceRms) {
        return { frequency: null, clarity: 0, rms: rms };
      }

      const tauMax = Math.min(this.tauMax, Math.floor(workLength * 0.48));
      const windowLength = workLength - tauMax;
      if (windowLength < 256) {
        return { frequency: null, clarity: 0, rms: rms };
      }

      const difference = this.difference;
      for (let tau = 1; tau <= tauMax; tau++) {
        let energy = 0;
        for (let i = 0; i < windowLength; i++) {
          const delta = work[i] - work[i + tau];
          energy += delta * delta;
        }
        difference[tau] = energy;
      }

      // Cumulative mean normalized difference: the heart of YIN.
      const cmnd = this.cmnd;
      cmnd[0] = 1;
      let runningSum = 0;
      for (let tau = 1; tau <= tauMax; tau++) {
        runningSum += difference[tau];
        cmnd[tau] = runningSum > 0 ? (difference[tau] * tau) / runningSum : 1;
      }

      let candidate = -1;
      for (let tau = this.tauMin; tau < tauMax; tau++) {
        if (cmnd[tau] < this.threshold) {
          while (tau + 1 < tauMax && cmnd[tau + 1] < cmnd[tau]) {
            tau++;
          }
          candidate = tau;
          break;
        }
      }

      // Quiet or imperfect signals sometimes never pass the strict threshold.
      // A global minimum is still useful when it is convincingly periodic.
      if (candidate === -1) {
        let best = this.tauMin;
        for (let tau = this.tauMin + 1; tau < tauMax; tau++) {
          if (cmnd[tau] < cmnd[best]) best = tau;
        }
        if (cmnd[best] > this.maxAcceptableAperiodicity) {
          return { frequency: null, clarity: 0, rms: rms };
        }
        candidate = best;
      }

      if (candidate <= 1 || candidate >= tauMax - 1) {
        return { frequency: null, clarity: 0, rms: rms };
      }

      // Refine the period with a parabola around the local minimum. One
      // sample at the low E is roughly one cent, so this matters.
      const y0 = cmnd[candidate - 1];
      const y1 = cmnd[candidate];
      const y2 = cmnd[candidate + 1];
      const denominator = 2 * (y0 + y2 - 2 * y1);
      let offset = 0;
      if (Math.abs(denominator) > 1e-12) {
        offset = (y0 - y2) / denominator;
        if (offset > 0.5) offset = 0.5;
        if (offset < -0.5) offset = -0.5;
      }

      const period = candidate + offset;
      const frequency = this.workRate / period;
      const clarity = 1 - cmnd[candidate];

      if (
        !Number.isFinite(frequency) ||
        frequency < this.minFreq ||
        frequency > this.maxFreq ||
        clarity < 0.77
      ) {
        return { frequency: null, clarity: Math.max(0, clarity), rms: rms };
      }

      return {
        frequency: frequency,
        clarity: clarity,
        rms: rms
      };
    }
  }

  global.PitchDetector = PitchDetector;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = PitchDetector;
  }
})(typeof window !== 'undefined' ? window : globalThis);
