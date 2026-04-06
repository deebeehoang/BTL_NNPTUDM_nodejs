/**
 * WebGL Distortion Transition Slider
 * Sử dụng Three.js và GLSL shaders để tạo hiệu ứng chuyển ảnh biến dạng 3D
 */

class WebGLDistortionSlider {
    constructor(options) {
        this.container = options.container;
        this.images = options.images || [];
        this.currentIndex = 0;
        this.isAnimating = false;
        this.autoPlayInterval = null;
        this.autoPlayDuration = options.autoPlayDuration || 5000;
        this.transitionEffects = ['liquid', 'swirl', 'glitch', 'ripple', 'zoom', 'curl'];
        this.currentEffect = 0;
        
        if (!this.container || this.images.length === 0) {
            console.error('WebGLDistortionSlider: Container or images missing');
            return;
        }
        
        this.init();
    }
    
    init() {
        // Tạo scene, camera, renderer
        this.scene = new THREE.Scene();
        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
        this.camera.position.z = 1;
        
        this.renderer = new THREE.WebGLRenderer({ 
            alpha: true,
            antialias: true 
        });
        this.renderer.setSize(this.container.offsetWidth, this.container.offsetHeight);
        this.container.appendChild(this.renderer.domElement);
        
        // Load textures
        this.textureLoader = new THREE.TextureLoader();
        this.textures = [];
        this.loadTextures();
        
        // Tạo displacement map (noise texture cho hiệu ứng distortion)
        this.createDisplacementTexture();
        
        // Setup shader material
        this.setupMaterial();
        
        // Tạo mesh
        const geometry = new THREE.PlaneGeometry(2, 2);
        this.mesh = new THREE.Mesh(geometry, this.material);
        this.scene.add(this.mesh);
        
        // Animation loop
        this.animate();
        
        // Responsive
        window.addEventListener('resize', () => this.onResize());
        
        // Mouse move distortion
        this.setupMouseDistortion();
    }
    
    loadTextures() {
        let loadedCount = 0;
        
        this.images.forEach((imageUrl, index) => {
            this.textureLoader.load(
                imageUrl,
                (texture) => {
                    this.textures[index] = texture;
                    loadedCount++;
                    
                    if (loadedCount === this.images.length) {
                        this.onTexturesLoaded();
                    }
                },
                undefined,
                (error) => {
                    console.error('Error loading texture:', imageUrl, error);
                    // Tạo texture placeholder
                    const canvas = document.createElement('canvas');
                    canvas.width = 512;
                    canvas.height = 512;
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = '#667eea';
                    ctx.fillRect(0, 0, 512, 512);
                    this.textures[index] = new THREE.CanvasTexture(canvas);
                    loadedCount++;
                    
                    if (loadedCount === this.images.length) {
                        this.onTexturesLoaded();
                    }
                }
            );
        });
    }
    
    onTexturesLoaded() {
        if (this.textures.length > 0) {
            this.material.uniforms.texture1.value = this.textures[0];
            this.material.uniforms.texture2.value = this.textures[1] || this.textures[0];
        }
    }
    
    createDisplacementTexture() {
        // Tạo noise texture cho hiệu ứng distortion
        const size = 512;
        const data = new Uint8Array(size * size * 4);
        
        for (let i = 0; i < size * size; i++) {
            const stride = i * 4;
            const noise = Math.random() * 255;
            data[stride] = noise;
            data[stride + 1] = noise;
            data[stride + 2] = noise;
            data[stride + 3] = 255;
        }
        
        this.displacementTexture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
        this.displacementTexture.needsUpdate = true;
    }
    
    setupMaterial() {
        // Vertex Shader
        const vertexShader = `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;
        
        // Fragment Shader với nhiều hiệu ứng distortion đa dạng
        const fragmentShader = `
            uniform sampler2D texture1;
            uniform sampler2D texture2;
            uniform sampler2D displacement;
            uniform float progress;
            uniform float intensity;
            uniform vec2 mouse;
            
            varying vec2 vUv;
            
            // Hàm random
            float random(vec2 st) {
                return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
            }
            
            void main() {
                vec2 uv = vUv;
                vec2 center = vec2(0.5, 0.5);
                vec2 toCenter = uv - center;
                float dist = length(toCenter);
                
                // === HIỆU ỨNG 1: Liquid/Fluid Distortion (Tan chảy) ===
                vec2 liquidUV = uv;
                float liquidWave = sin(uv.y * 8.0 + progress * 6.28) * cos(uv.x * 6.0 + progress * 4.0);
                liquidUV.x += liquidWave * intensity * 0.08 * (1.0 - progress);
                liquidUV.y += sin(uv.x * 10.0 - progress * 8.0) * intensity * 0.06 * progress;
                
                // === HIỆU ỨNG 2: Zoom Burst (Phóng to từ tâm) ===
                vec2 zoomUV = center + toCenter * (1.0 + progress * 0.3);
                
                // === HIỆU ỨNG 3: Swirl/Vortex (Xoáy nước) ===
                float angle = progress * 3.14159265 * 1.5;
                float swirl = sin(dist * 5.0 - progress * 6.28);
                float c = cos(angle * dist * 3.0);
                float s = sin(angle * dist * 3.0);
                vec2 swirlUV = center + mat2(c, -s, s, c) * toCenter;
                
                // === HIỆU ỨNG 4: Glitch/Digital Tear (Rách/glitch) ===
                vec2 glitchUV = uv;
                float glitchStrength = step(0.5, random(vec2(floor(uv.y * 20.0), progress)));
                glitchUV.x += (random(vec2(uv.y * 50.0, progress)) - 0.5) * glitchStrength * intensity * 0.15;
                
                // === HIỆU ỨNG 5: Ripple (Gợn nước) ===
                vec2 rippleUV = uv;
                float ripple = sin(dist * 30.0 - progress * 15.0) * (1.0 - progress);
                rippleUV += normalize(toCenter) * ripple * intensity * 0.04;
                
                // === HIỆU ỨNG 6: Page Curl (Cuộn trang) ===
                vec2 curlUV = uv;
                float curlAmount = smoothstep(0.0, 1.0, (uv.x - progress + 0.5));
                curlUV.y += sin(curlAmount * 3.14159265) * intensity * 0.15;
                
                // === MIX CÁC HIỆU ỨNG ===
                // Thay đổi hiệu ứng theo thời gian
                vec2 finalUV;
                
                if (progress < 0.3) {
                    // Giai đoạn 1: Liquid + Ripple
                    finalUV = mix(liquidUV, rippleUV, progress / 0.3);
                } else if (progress < 0.6) {
                    // Giai đoạn 2: Swirl + Zoom
                    float t = (progress - 0.3) / 0.3;
                    finalUV = mix(swirlUV, zoomUV, t);
                } else {
                    // Giai đoạn 3: Glitch + Page Curl
                    float t = (progress - 0.6) / 0.4;
                    finalUV = mix(glitchUV, curlUV, t);
                }
                
                // Thêm nhiễu động dựa trên mouse
                finalUV += (mouse - 0.5) * intensity * 0.02 * sin(progress * 6.28);
                
                // Sample textures với UV đã distort
                vec4 color1 = texture2D(texture1, finalUV);
                vec4 color2 = texture2D(texture2, finalUV);
                
                // Chromatic aberration (lệch màu RGB) cho hiệu ứng chuyên nghiệp
                float aberration = intensity * 0.01 * sin(progress * 3.14159265);
                vec4 color1R = texture2D(texture1, finalUV + vec2(aberration, 0.0));
                vec4 color1G = texture2D(texture1, finalUV);
                vec4 color1B = texture2D(texture1, finalUV - vec2(aberration, 0.0));
                
                vec4 color2R = texture2D(texture2, finalUV + vec2(aberration, 0.0));
                vec4 color2G = texture2D(texture2, finalUV);
                vec4 color2B = texture2D(texture2, finalUV - vec2(aberration, 0.0));
                
                vec4 finalColor1 = vec4(color1R.r, color1G.g, color1B.b, color1.a);
                vec4 finalColor2 = vec4(color2R.r, color2G.g, color2B.b, color2.a);
                
                // Smooth fade với easing
                float fadeProgress = smoothstep(0.0, 1.0, progress);
                vec4 finalColor = mix(finalColor1, finalColor2, fadeProgress);
                
                // Thêm vignette nhẹ khi transition
                float vignette = 1.0 - dist * 0.3 * sin(progress * 3.14159265);
                finalColor.rgb *= vignette;
                
                gl_FragColor = finalColor;
            }
        `;
        
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                texture1: { value: null },
                texture2: { value: null },
                displacement: { value: this.displacementTexture },
                progress: { value: 0 },
                intensity: { value: 0.5 },
                mouse: { value: new THREE.Vector2(0.5, 0.5) }
            },
            vertexShader,
            fragmentShader,
            transparent: true
        });
    }
    
    setupMouseDistortion() {
        this.container.addEventListener('mousemove', (e) => {
            const rect = this.container.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = 1.0 - (e.clientY - rect.top) / rect.height;
            
            this.material.uniforms.mouse.value.set(x, y);
            // Tăng intensity khi di chuột
            this.material.uniforms.intensity.value = 0.7;
        });
        
        this.container.addEventListener('mouseleave', () => {
            // Reset intensity
            this.material.uniforms.intensity.value = 0.5;
        });
    }
    
    transitionTo(nextIndex) {
        if (this.isAnimating || nextIndex === this.currentIndex) return;
        if (nextIndex < 0 || nextIndex >= this.images.length) return;
        
        this.isAnimating = true;
        
        // Set textures
        this.material.uniforms.texture1.value = this.textures[this.currentIndex];
        this.material.uniforms.texture2.value = this.textures[nextIndex];
        
        // Animate progress từ 0 → 1
        const duration = 1.2; // 1.2 giây
        const startTime = Date.now();
        
        const animateTransition = () => {
            const elapsed = (Date.now() - startTime) / 1000;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-in-out)
            const eased = progress < 0.5 
                ? 2 * progress * progress 
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            
            this.material.uniforms.progress.value = eased;
            
            if (progress < 1) {
                requestAnimationFrame(animateTransition);
            } else {
                this.material.uniforms.progress.value = 0;
                this.currentIndex = nextIndex;
                this.isAnimating = false;
                
                // Trigger callback nếu có
                if (this.onSlideChange) {
                    this.onSlideChange(nextIndex);
                }
            }
        };
        
        animateTransition();
    }
    
    next() {
        const nextIndex = (this.currentIndex + 1) % this.images.length;
        this.transitionTo(nextIndex);
    }
    
    prev() {
        const nextIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
        this.transitionTo(nextIndex);
    }
    
    goTo(index) {
        this.transitionTo(index);
    }
    
    startAutoPlay() {
        this.stopAutoPlay();
        this.autoPlayInterval = setInterval(() => {
            this.next();
        }, this.autoPlayDuration);
    }
    
    stopAutoPlay() {
        if (this.autoPlayInterval) {
            clearInterval(this.autoPlayInterval);
            this.autoPlayInterval = null;
        }
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        this.renderer.render(this.scene, this.camera);
    }
    
    onResize() {
        const width = this.container.offsetWidth;
        const height = this.container.offsetHeight;
        
        this.renderer.setSize(width, height);
        
        // Cập nhật aspect ratio
        const aspect = width / height;
        this.camera.left = -aspect;
        this.camera.right = aspect;
        this.camera.updateProjectionMatrix();
    }
    
    destroy() {
        this.stopAutoPlay();
        
        // Cleanup Three.js resources
        if (this.mesh) {
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
        
        this.textures.forEach(texture => {
            if (texture) texture.dispose();
        });
        
        if (this.displacementTexture) {
            this.displacementTexture.dispose();
        }
        
        if (this.renderer) {
            this.renderer.dispose();
            if (this.renderer.domElement && this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
        }
    }
}

// Export cho global scope
window.WebGLDistortionSlider = WebGLDistortionSlider;

