class JARVISOrb {
    constructor() {
        this.canvas = document.getElementById('orbCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.setCanvasSize();
        this.setupOrb();
        this.animate();
        window.addEventListener('resize', () => this.setCanvasSize());
    }

    setCanvasSize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    setupOrb() {
        // Center of the orb
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
        
        // Orb properties
        this.orbRadius = 150;
        this.rotationSpeed = 0.001;
        this.rotation = 0;
        
        // Deep bright orange color scheme
        this.primaryColor = '#ff8c00';      // Deep Orange
        this.secondaryColor = '#ffa500';    // Bright Orange
        this.accentColor = '#ffb84d';       // Light Orange
        this.coreColor = '#fff44f';         // Golden Core
        
        // Orbital rings configuration
        this.rings = [
            { radius: 80, speed: 0.005, thickness: 2, opacity: 0.8 },
            { radius: 120, speed: -0.003, thickness: 2.5, opacity: 0.6 },
            { radius: 160, speed: 0.004, thickness: 2, opacity: 0.5 },
            { radius: 200, speed: -0.002, thickness: 2, opacity: 0.4 }
        ];
        
        // Orbital objects
        this.orbiters = [];
        this.createOrbiters();
        
        // Particles for atmosphere
        this.particles = [];
        this.createParticles(200);
    }

    createOrbiters() {
        this.rings.forEach((ring, index) => {
            for (let i = 0; i < 3; i++) {
                this.orbiters.push({
                    ringIndex: index,
                    angle: (i * Math.PI * 2) / 3,
                    size: 5 + index * 0.5,
                    speed: ring.speed
                });
            }
        });
    }

    createParticles(count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = this.orbRadius * 0.5 + Math.random() * this.orbRadius * 0.5;
            this.particles.push({
                x: this.centerX + Math.cos(angle) * distance,
                y: this.centerY + Math.sin(angle) * distance,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                life: Math.random() * 200 + 100,
                maxLife: Math.random() * 200 + 100,
                size: Math.random() * 2 + 0.5
            });
        }
    }

    drawSphere() {
        // Draw outer glow
        const glowGradient = this.ctx.createRadialGradient(
            this.centerX, this.centerY, 0,
            this.centerX, this.centerY, this.orbRadius + 30
        );
        glowGradient.addColorStop(0, 'rgba(255, 140, 0, 0.4)');
        glowGradient.addColorStop(0.5, 'rgba(255, 140, 0, 0.1)');
        glowGradient.addColorStop(1, 'rgba(255, 140, 0, 0)');
        
        this.ctx.fillStyle = glowGradient;
        this.ctx.fillRect(this.centerX - this.orbRadius - 30, this.centerY - this.orbRadius - 30, 
                          (this.orbRadius + 30) * 2, (this.orbRadius + 30) * 2);

        // Draw main sphere with gradient
        const sphereGradient = this.ctx.createRadialGradient(
            this.centerX - this.orbRadius * 0.3, 
            this.centerY - this.orbRadius * 0.3, 
            10,
            this.centerX, 
            this.centerY, 
            this.orbRadius
        );
        
        sphereGradient.addColorStop(0, this.accentColor);
        sphereGradient.addColorStop(0.4, this.secondaryColor);
        sphereGradient.addColorStop(0.8, this.primaryColor);
        sphereGradient.addColorStop(1, 'rgba(139, 69, 19, 0.9)');
        
        this.ctx.fillStyle = sphereGradient;
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, this.orbRadius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw sphere highlight
        const highlightGradient = this.ctx.createRadialGradient(
            this.centerX - this.orbRadius * 0.4,
            this.centerY - this.orbRadius * 0.4,
            0,
            this.centerX - this.orbRadius * 0.4,
            this.centerY - this.orbRadius * 0.4,
            this.orbRadius * 0.6
        );
        highlightGradient.addColorStop(0, 'rgba(255, 255, 200, 0.6)');
        highlightGradient.addColorStop(1, 'rgba(255, 140, 0, 0)');
        
        this.ctx.fillStyle = highlightGradient;
        this.ctx.fillRect(this.centerX - this.orbRadius, this.centerY - this.orbRadius, 
                         this.orbRadius * 2, this.orbRadius * 2);
        
        // Draw core glow
        const coreGradient = this.ctx.createRadialGradient(
            this.centerX, this.centerY, 0,
            this.centerX, this.centerY, this.orbRadius * 0.2
        );
        coreGradient.addColorStop(0, this.coreColor);
        coreGradient.addColorStop(1, 'rgba(255, 140, 0, 0.3)');
        
        this.ctx.fillStyle = coreGradient;
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, this.orbRadius * 0.15, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawRings() {
        this.rotation += this.rotationSpeed;
        
        this.rings.forEach((ring, index) => {
            // Draw main ring
            this.ctx.strokeStyle = this.getOrangeShade(ring.opacity);
            this.ctx.lineWidth = ring.thickness;
            this.ctx.beginPath();
            this.ctx.arc(this.centerX, this.centerY, ring.radius, 0, Math.PI * 2);
            this.ctx.stroke();
            
            // Draw rotating accent dots on ring
            for (let i = 0; i < 8; i++) {
                const angle = (i * Math.PI * 2) / 8 + this.rotation * ring.speed;
                const x = this.centerX + Math.cos(angle) * ring.radius;
                const y = this.centerY + Math.sin(angle) * ring.radius;
                
                this.ctx.fillStyle = this.secondaryColor;
                this.ctx.globalAlpha = ring.opacity;
                this.ctx.beginPath();
                this.ctx.arc(x, y, 3, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.globalAlpha = 1;
            }
        });
    }

    drawOrbiters() {
        this.orbiters.forEach(orbiter => {
            const ring = this.rings[orbiter.ringIndex];
            const angle = orbiter.angle + this.rotation * orbiter.speed;
            
            const x = this.centerX + Math.cos(angle) * ring.radius;
            const y = this.centerY + Math.sin(angle) * ring.radius;
            
            // Orbiter glow
            const orbiterGlow = this.ctx.createRadialGradient(x, y, 0, x, y, orbiter.size * 3);
            orbiterGlow.addColorStop(0, 'rgba(255, 140, 0, 0.8)');
            orbiterGlow.addColorStop(1, 'rgba(255, 140, 0, 0)');
            
            this.ctx.fillStyle = orbiterGlow;
            this.ctx.fillRect(x - orbiter.size * 3, y - orbiter.size * 3, 
                             orbiter.size * 6, orbiter.size * 6);
            
            // Orbiter core
            this.ctx.fillStyle = this.secondaryColor;
            this.ctx.beginPath();
            this.ctx.arc(x, y, orbiter.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    drawParticles() {
        this.particles.forEach((particle, index) => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life--;
            
            if (particle.life <= 0) {
                const angle = Math.random() * Math.PI * 2;
                const distance = this.orbRadius * 0.5 + Math.random() * this.orbRadius * 0.5;
                particle.x = this.centerX + Math.cos(angle) * distance;
                particle.y = this.centerY + Math.sin(angle) * distance;
                particle.life = particle.maxLife;
            }
            
            const alpha = particle.life / particle.maxLife;
            this.ctx.fillStyle = `rgba(255, 140, 0, ${alpha * 0.6})`;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    getOrangeShade(opacity) {
        return `rgba(255, 140, 0, ${opacity})`;
    }

    animate() {
        // Clear canvas
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw elements
        this.drawParticles();
        this.drawRings();
        this.drawOrbiters();
        this.drawSphere();
        
        requestAnimationFrame(() => this.animate());
    }
}

// Initialize JARVIS Orb
window.addEventListener('load', () => {
    new JARVISOrb();
});
