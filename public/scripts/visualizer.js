document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('living-nebula-canvas');
    if (!canvas) {
        console.error('Canvas element #living-nebula-canvas not found.');
        return;
    }

    const ctx = canvas.getContext('2d');
    let animationId;
    let time = 0; // ms-based timeline
    let dpr = Math.max(1, window.devicePixelRatio || 1);
    let seeds = [];
    let ambientParticles = [];
    let lastAmbientSpawn = 0;
    let noteSprites = [];
    let lastNoteSpawn = 0;
    const CONFIG = {
        barStep: 12, // px at DPR=1
        barWidth: 2, // px at DPR=1
        lineStep: 10, // px at DPR=1
        ambientSpawnMs: 180,
        ambientMax: 70,
        noteSpawnMs: 260,
        noteMax: 24,
    };

    // ===================================
    //  SPECTRAL SCANNER (Hero)
    // ===================================

    function setCanvasSize() {
        const rect = canvas.getBoundingClientRect();
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
        // Re-seed per bar on resize for stable, non-repeating variation
        const step = Math.max(6, Math.floor(CONFIG.barStep * dpr));
        const count = Math.max(48, Math.floor(canvas.width / step));
        seeds = new Array(count).fill(0).map(() => Math.random() * 1000);
    }

    function drawSpectralScanner() {
        const width = canvas.width;
        const height = canvas.height;
        const baseline = height * 0.84;
        const maxHeight = height * 0.12;
        const step = Math.max(6, Math.floor(CONFIG.barStep * dpr));
        const barWidth = Math.max(1, Math.floor(CONFIG.barWidth * dpr));
        const numBars = Math.floor(width / step);

        ctx.clearRect(0, 0, width, height);

        // Subtle grid baseline
        ctx.save();
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
        ctx.lineWidth = 1 * dpr;
        ctx.beginPath();
        ctx.moveTo(0, baseline);
        ctx.lineTo(width, baseline);
        ctx.stroke();
        ctx.restore();

        // Single calm bar layer
        const layer = {
            speed: 0.0011,
            scale: 0.9,
            colorA: 'rgba(96, 165, 250, 0.65)',
            colorB: 'rgba(56, 189, 248, 0.65)'
        };
        ctx.save();
        const grad = ctx.createLinearGradient(0, baseline - maxHeight, 0, baseline + maxHeight);
        grad.addColorStop(0, layer.colorA);
        grad.addColorStop(1, layer.colorB);
        ctx.fillStyle = grad;
        ctx.shadowColor = 'rgba(56, 189, 248, 0.18)';
        ctx.shadowBlur = 6 * dpr;

        function calc(idx) {
            const seed = seeds[(idx + seeds.length) % seeds.length];
            const k = idx / numBars;
            const env = Math.pow(Math.sin(k * Math.PI), 1.6);
            const w1 = Math.sin(idx * 0.16 + time * layer.speed + seed * 0.01);
            const w2 = Math.sin(idx * 0.07 + time * layer.speed * 1.4 + seed * 0.013);
            const base = Math.abs(w1 * 0.6 + w2 * 0.4);
            return base * env;
        }

        for (let i = 0; i < numBars; i++) {
            const x = i * step + (step - barWidth) / 2;
            const a0 = calc(i);
            const aPrev = calc(i - 1);
            const aNext = calc(i + 1);
            const amp = (aPrev + 2 * a0 + aNext) / 4; // smoothing
            const h = amp * maxHeight * layer.scale;
            if (h < 0.5) continue;
            ctx.fillRect(x, baseline - h, barWidth, h);
            ctx.fillRect(x, baseline, barWidth, h * 0.8);
        }
        ctx.restore();

        // No scanning beam for a cleaner look

        // Single fine line wave overlay
        const lineStep = Math.max(6, Math.floor(CONFIG.lineStep * dpr));
        ctx.save();
        const lineGrad = ctx.createLinearGradient(0, baseline - maxHeight, 0, baseline + maxHeight);
        lineGrad.addColorStop(0, '#93c5fd');
        lineGrad.addColorStop(1, '#38bdf8');
        ctx.strokeStyle = lineGrad;
        ctx.lineWidth = 1.6 * dpr;
        ctx.shadowColor = 'rgba(56, 189, 248, 0.15)';
        ctx.shadowBlur = 6 * dpr;
        ctx.beginPath();
        let startedLine = false;
        const waveSpeed = 0.0015;
        const waveAmp = 0.55;
        for (let x = 0; x <= width; x += lineStep) {
            const i = x / step;
            const k = x / width;
            const env = Math.pow(Math.sin(k * Math.PI), 1.6);
            const y = baseline - Math.abs(Math.sin(i * 0.16 + time * waveSpeed) * 0.7 + Math.sin(i * 0.05 + time * waveSpeed * 1.2) * 0.3) * env * waveAmp * maxHeight;
            if (!startedLine) {
                ctx.moveTo(x, y);
                startedLine = true;
            } else {
                const prevX = x - lineStep;
                const prevI = prevX / step;
                const pk = prevX / width;
                const penv = Math.pow(Math.sin(pk * Math.PI), 1.6);
                const py = baseline - Math.abs(Math.sin(prevI * 0.16 + time * waveSpeed) * 0.7 + Math.sin(prevI * 0.05 + time * waveSpeed * 1.2) * 0.3) * penv * waveAmp * maxHeight;
                const cx = (prevX + x) / 2;
                const cy = (py + y) / 2;
                ctx.quadraticCurveTo(prevX, py, cx, cy);
            }
        }
        ctx.stroke();
        ctx.restore();

        // Ambient particle accents in the upper empty area
        if (time - lastAmbientSpawn > CONFIG.ambientSpawnMs && ambientParticles.length < CONFIG.ambientMax) {
            lastAmbientSpawn = time;
            const spawnCount = 1 + Math.floor(Math.random() * 2);
            for (let s = 0; s < spawnCount; s++) {
                ambientParticles.push({
                    x: Math.random() * width,
                    y: baseline - (maxHeight * 1.2) - Math.random() * (height * 0.28),
                    r: (Math.random() * 1.2 + 0.8) * dpr,
                    alpha: 0.18 + Math.random() * 0.12,
                    vy: 0.08 * dpr + Math.random() * 0.06 * dpr,
                    vx: (Math.random() - 0.5) * 0.05 * dpr,
                    phase: Math.random() * Math.PI * 2,
                });
            }
        }

        for (let i = ambientParticles.length - 1; i >= 0; i--) {
            const p = ambientParticles[i];
            p.y += -p.vy;
            p.x += p.vx + Math.sin(time * 0.001 + p.phase) * 0.05 * dpr;
            p.alpha *= 0.996;
            if (p.alpha < 0.02 || p.y < height * 0.12) {
                ambientParticles.splice(i, 1);
                continue;
            }
            ctx.save();
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
            g.addColorStop(0, `rgba(147, 197, 253, ${p.alpha.toFixed(3)})`);
            g.addColorStop(1, 'rgba(147, 197, 253, 0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Music-specific accents: floating notes near the wave crest
        function sampleWaveY(x) {
            const i = x / step;
            const k = x / width;
            const env = Math.pow(Math.sin(k * Math.PI), 1.6);
            const amp = Math.abs(Math.sin(i * 0.16 + time * 0.0015) * 0.7 + Math.sin(i * 0.05 + time * 0.0018) * 0.3) * env * 0.55;
            return baseline - amp * maxHeight;
        }

        if (time - lastNoteSpawn > CONFIG.noteSpawnMs && noteSprites.length < CONFIG.noteMax) {
            lastNoteSpawn = time;
            const spawnCount = 1 + Math.floor(Math.random() * 2);
            const symbols = ['♪', '♫', '♩', '♬'];
            for (let s = 0; s < spawnCount; s++) {
                const x = Math.random() * width;
                const y = sampleWaveY(x) - (6 + Math.random() * 14) * dpr;
                noteSprites.push({
                    x,
                    y,
                    vx: (Math.random() - 0.5) * 0.06 * dpr,
                    vy: -(0.06 + Math.random() * 0.05) * dpr,
                    alpha: 0.28 + Math.random() * 0.18,
                    size: (10 + Math.random() * 6) * dpr,
                    symbol: symbols[Math.floor(Math.random() * symbols.length)],
                    rot: (Math.random() - 0.5) * 0.15,
                });
            }
        }

        for (let i = noteSprites.length - 1; i >= 0; i--) {
            const n = noteSprites[i];
            n.x += n.vx;
            n.y += n.vy;
            n.alpha *= 0.995;
            if (n.alpha < 0.05 || n.y < height * 0.18) {
                noteSprites.splice(i, 1);
                continue;
            }
            ctx.save();
            ctx.translate(n.x, n.y);
            ctx.rotate(n.rot);
            ctx.shadowColor = 'rgba(56, 189, 248, 0.25)';
            ctx.shadowBlur = 8 * dpr;
            ctx.fillStyle = `rgba(147, 197, 253, ${n.alpha.toFixed(3)})`;
            ctx.font = `${Math.floor(n.size)}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(n.symbol, 0, 0);
            ctx.restore();
        }
    }

    // ===================================
    //  ANIMATION LOOP
    // ===================================



    // (Legacy ripple code removed)

    function animate(now) {
        time = now || performance.now();
        drawSpectralScanner();
        animationId = requestAnimationFrame(animate);
    }

    // ===================================
    //  INITIALIZATION & EVENT LISTENERS
    // ===================================

    window.addEventListener('resize', () => {
        dpr = Math.max(1, window.devicePixelRatio || 1);
        setCanvasSize();
    }, false);

    setCanvasSize();
    animate();

    // Enter the Lab 按钮功能
    const enterBtn = document.querySelector('#hero-content a');
    if (enterBtn) {
        enterBtn.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelector('#hook')?.scrollIntoView({
                behavior: 'smooth'
            });
        });
    }
});