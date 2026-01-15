// ===== MOUSE TRAIL EFFECT =====
const canvas = document.getElementById('mouseTrail');
const ctx = canvas.getContext('2d');
const particles = [];
const mousePosition = { x: 0, y: 0 };

function setCanvasSize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
setCanvasSize();
window.addEventListener('resize', setCanvasSize);

class Particle {
    constructor(x, y, isClick = false, isScroll = false) {
        this.x = x;
        this.y = y;
        this.size = isClick ? 8 : (isScroll ? 5 : 3);
        this.opacity = 1;
        this.isClick = isClick;
        this.isScroll = isScroll;
        this.angle = Math.random() * Math.PI * 2;
        this.velocity = isClick ? 8 : (isScroll ? 4 : 1);
        
        if (isClick) {
            this.moveX = Math.cos(this.angle) * this.velocity;
            this.moveY = Math.sin(this.angle) * this.velocity;
        } else if (isScroll) {
            this.moveX = (Math.random() - 0.5) * this.velocity;
            this.moveY = Math.random() * this.velocity;
        }
    }

    draw() {
        if (this.isClick) {
            ctx.fillStyle = `rgba(147, 112, 219, ${this.opacity})`;
        } else if (this.isScroll) {
            ctx.fillStyle = `rgba(186, 85, 211, ${this.opacity})`;
        } else {
            ctx.fillStyle = `rgba(138, 43, 226, ${this.opacity})`;
        }
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
    }

    update() {
        if (this.isClick) {
            this.x += this.moveX;
            this.y += this.moveY;
            this.size *= 0.95;
            this.opacity -= 0.03;
        } else if (this.isScroll) {
            this.x += this.moveX;
            this.y += this.moveY;
            this.moveY += 0.2;
            this.opacity -= 0.02;
        } else {
            let dx = mousePosition.x - this.x;
            let dy = mousePosition.y - this.y;
            this.x += dx * 0.05;
            this.y += dy * 0.05;
            const distance = Math.sqrt(dx * dx + dy * dy);
            this.opacity = Math.max(0, 1 - distance / 100);
            this.size = Math.max(0.5, this.size * 0.995);
        }
    }
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw();
        if (particles[i].opacity <= 0) {
            particles.splice(i, 1);
        }
    }
    requestAnimationFrame(animate);
}

animate();

window.addEventListener('mousemove', (event) => {
    mousePosition.x = event.x;
    mousePosition.y = event.y;
    particles.push(new Particle(mousePosition.x, mousePosition.y));
});

window.addEventListener('click', (event) => {
    for (let i = 0; i < 15; i++) {
        particles.push(new Particle(event.x, event.y, true));
    }
});

let lastScrollY = window.scrollY;
let scrollTimeout;
window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    const scrollDiff = window.scrollY - lastScrollY;
    const scrollRight = window.innerWidth - 20;
    
    if (Math.abs(scrollDiff) > 5) {
        for (let i = 0; i < 3; i++) {
            particles.push(new Particle(
                scrollRight + (Math.random() - 0.5) * 20,
                window.scrollY + window.innerHeight / 2 + (Math.random() - 0.5) * 100,
                false,
                true
            ));
        }
    }
    
    lastScrollY = window.scrollY;
    scrollTimeout = setTimeout(() => {
        lastScrollY = window.scrollY;
    }, 50);
});
