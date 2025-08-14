document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('living-nebula-canvas');
    if (!canvas) {
        console.error('Canvas element #living-nebula-canvas not found.');
        return;
    }

    const ctx = canvas.getContext('2d');
    let animationId;
    let ripples = [];
    let microRipples = [];
    let breathRipples = [];
    let particles = [];
    let bars = [];
    let lastRippleTime = 0;
    let lastMicroRippleTime = 0;
    let lastBreathRippleTime = 0;
    let globalColorPhase = 0;

    // ===================================
    //  CLASS DEFINITIONS
    // ===================================

    class MusicRipple {
        constructor(x, y, maxRadius, speed, type) {
            this.x = x;
            this.y = y;
            this.radius = 0;
            this.maxRadius = maxRadius;
            this.speed = speed;
            this.opacity = 1;
            this.type = type; // 'main', 'micro', 'breath'
            this.colorPhase = Math.random() * Math.PI * 2;
            this.pulsePhase = Math.random() * Math.PI * 2;
            this.lineWidth = this.type === 'main' ? 1.5 : this.type === 'micro' ? 0.5 : 1;
        }

        update() {
            this.radius += this.speed;
            this.opacity = Math.max(0, 1 - (this.radius / this.maxRadius));
            this.colorPhase += 0.02;
            this.pulsePhase += 0.03;
        }

        draw(ctx) {
            if (this.opacity <= 0) return;

            ctx.save();
            const dynamicColor = this.getDynamicColor();
            ctx.globalAlpha = this.opacity * (this.type === 'main' ? 0.4 : this.type === 'micro' ? 0.25 : 0.15);
            ctx.strokeStyle = dynamicColor;
            ctx.lineWidth = this.lineWidth * this.opacity;
            
            ctx.beginPath();
            const segments = this.type === 'micro' ? 48 : 96;
            for (let i = 0; i <= segments; i++) {
                const angle = (i / segments) * Math.PI * 2;
                const waveFreq = this.type === 'main' ? 8 : (this.type === 'micro' ? 12 : 4);
                const waveAmp = this.type === 'main' ? 1.5 : (this.type === 'micro' ? 0.8 : 2);
                const waveOffset = Math.sin(angle * waveFreq + Date.now() * 0.005 + this.pulsePhase) * waveAmp;
                const x = this.x + Math.cos(angle) * (this.radius + waveOffset);
                const y = this.y + Math.sin(angle) * (this.radius + waveOffset);
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();

            if (this.type === 'main' && this.radius < this.maxRadius * 0.7) {
                this.drawInnerNotes(ctx, dynamicColor);
            }
            ctx.restore();
        }

        getDynamicColor() {
            const hue = (this.colorPhase + globalColorPhase) % (Math.PI * 2);
            let r, g, b;
            if (hue < Math.PI * 2/3) {
                const t = hue / (Math.PI * 2/3);
                r = 139 * (1 - t) + 56 * t;
                g = 92 * (1 - t) + 189 * t;
                b = 246 * (1 - t) + 248 * t;
            } else {
                const t = (hue - Math.PI * 2/3) / (Math.PI * 1/3);
                r = 56 * (1 - t) + 6 * t;
                g = 189 * (1 - t) + 182 * t;
                b = 248 * (1 - t) + 212 * t;
            }
            return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
        }

        drawInnerNotes(ctx, color) {
            const noteSymbols = ['♪', '♫', '♬'];
            for (let i = 0; i < 3; i++) {
                const angle = (i / 3) * Math.PI * 2 + this.radius * 0.05;
                const distance = this.radius * 0.4;
                const x = this.x + Math.cos(angle) * distance;
                const y = this.y + Math.sin(angle) * distance;
                const size = 8 + Math.sin(this.radius * 0.1 + i) * 4;
                ctx.fillStyle = color;
                ctx.globalAlpha = this.opacity * 0.8;
                ctx.font = `${size}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(noteSymbols[i], x, y);
            }
        }

        isDead() {
            return this.radius >= this.maxRadius || this.opacity <= 0;
        }
    }

    class Bar {
        constructor(x, y, width, maxHeight, color) {
            this.x = x;
            this.y = y; // Centerline Y
            this.width = width;
            this.maxHeight = maxHeight; // Max height for one side (up or down)
            this.height = 0;
            this.color = color;
            this.time = Math.random() * 100;
            this.speed = 0.01 + Math.random() * 0.015;
        }

        update() {
            this.time += this.speed;
            const noise = (Math.sin(this.time) + 1) / 2;
            this.height = noise * this.maxHeight;
        }

        draw(ctx) {
            ctx.save();
            const gradient = ctx.createLinearGradient(this.x, this.y - this.height, this.x, this.y + this.height);
            gradient.addColorStop(0, this.color.end);   // Top color
            gradient.addColorStop(0.5, this.color.start); // Center color
            gradient.addColorStop(1, this.color.end);   // Bottom color

            ctx.fillStyle = gradient;
            ctx.globalAlpha = 0.7; // Subtle but visible

            // Draw top bar growing upwards
            ctx.fillRect(this.x, this.y, this.width, -this.height);
            // Draw bottom bar growing downwards
            ctx.fillRect(this.x, this.y, this.width, this.height);
            
            ctx.restore();
        }
    }

    class Particle {
        constructor(x, y, color) {
            this.x = x;
            this.y = y;
            this.size = Math.random() * 2 + 1;
            this.speed = Math.random() * 1.5 + 0.5;
            this.angle = Math.random() * Math.PI * 2;
            this.velocity = { x: Math.cos(this.angle) * this.speed, y: Math.sin(this.angle) * this.speed };
            this.opacity = 1;
            this.decay = 0.02 + Math.random() * 0.01;
            this.color = color;
        }

        update() {
            this.x += this.velocity.x;
            this.y += this.velocity.y;
            this.opacity -= this.decay;
        }

        draw(ctx) {
            if (this.opacity <= 0) return;
            ctx.save();
            ctx.globalAlpha = this.opacity;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
            ctx.fill();
            ctx.restore();
        }

        isDead() {
            return this.opacity <= 0;
        }
    }



    // ===================================
    //  HELPER FUNCTIONS & SETUP
    // ===================================

    function resizeCanvas() {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
    }

    function setupBars() {
        bars = [];
        const barWidth = 3; // Thinner bars for a more refined look
        const barSpacing = 2;
        const numBars = Math.floor(canvas.width / (barWidth + barSpacing));
        const color = { start: 'rgba(139, 92, 246, 0.6)', end: 'rgba(56, 189, 248, 0.1)' }; // Center is brighter
        const centerY = canvas.height * 0.7; // Lowered the centerline further for better layout

        for (let i = 0; i < numBars; i++) {
            const x = i * (barWidth + barSpacing);
            const maxHeight = canvas.height * 0.1; // More subtle height
            bars.push(new Bar(x, centerY, barWidth, maxHeight, color));
        }
    }



    function createRipple(type) {
        const width = canvas.width;
        const height = canvas.height;
        const x = width * (0.3 + Math.random() * 0.4);
        const y = height * (0.3 + Math.random() * 0.4);
        let maxRadius, speed;

        if (type === 'main') {
            maxRadius = Math.min(width, height) * (0.15 + Math.random() * 0.15);
            speed = 0.6;
            // Create a particle burst for main ripples
            const rippleColor = new MusicRipple(0,0,0,0,'main').getDynamicColor(); // Get a representative color
            for (let i = 0; i < 30; i++) {
                particles.push(new Particle(x, y, rippleColor));
            }
        } else if (type === 'micro') {
            maxRadius = Math.min(width, height) * (0.05 + Math.random() * 0.08);
            speed = 1.0;
        } else { // breath
            maxRadius = Math.min(width, height) * (0.2 + Math.random() * 0.2);
            speed = 0.2;
        }
        return new MusicRipple(x, y, maxRadius, speed, type);
    }

    function animate() {
        const currentTime = Date.now();
        globalColorPhase += 0.005;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Animate Bars
        bars.forEach(bar => {
            bar.update();
            bar.draw(ctx);
        });

        if (currentTime - lastBreathRippleTime > 4500 + Math.random() * 1000) {
            breathRipples.push(createRipple('breath'));
            lastBreathRippleTime = currentTime;
            console.log('Creating a new breath ripple');
        }
        if (currentTime - lastRippleTime > 1800 + Math.random() * 500) {
            ripples.push(createRipple('main'));
            lastRippleTime = currentTime;
            console.log('Creating a new main ripple');
        }
        if (currentTime - lastMicroRippleTime > 700 + Math.random() * 300) {
            microRipples.push(createRipple('micro'));
            lastMicroRippleTime = currentTime;
            console.log('Creating a new micro ripple');
        }

        // Animate Particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.update();
            p.draw(ctx);
            if (p.isDead()) {
                particles.splice(i, 1);
            }
        }

        const allRipples = [breathRipples, ripples, microRipples];
        for (let i = 0; i < allRipples.length; i++) {
            for (let j = allRipples[i].length - 1; j >= 0; j--) {
                const ripple = allRipples[i][j];
                ripple.update();
                ripple.draw(ctx);
                if (ripple.isDead()) {
                    allRipples[i].splice(j, 1);
                }
            }
        }

        animationId = requestAnimationFrame(animate);
    }

    // ===================================
    //  INITIALIZATION & EVENT LISTENERS
    // ===================================

    window.addEventListener('resize', () => {
        resizeCanvas();
        setupBars();
    }, false);

    resizeCanvas();
    setupBars();
    animate();

    // Enter the Lab 按钮功能
    const enterBtn = document.querySelector('#hero-content a');
    if(enterBtn) {
        enterBtn.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelector('#hook')?.scrollIntoView({ behavior: 'smooth' });
        });
    }
});
