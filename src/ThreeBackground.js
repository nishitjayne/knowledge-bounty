/**
 * ThreeBackground.js
 *
 * Applies the full Three.js skill set:
 *  - threejs-fundamentals : WebGLRenderer, PerspectiveCamera, Clock, responsive resize
 *  - threejs-shaders      : ShaderMaterial with custom GLSL vertex displacement + fragment gradient
 *  - threejs-animation    : THREE.Clock delta-time loop + Spring physics class for mouse tracking
 *  - threejs-geometry     : PlaneGeometry (warp mesh) + BufferGeometry Points (constellation)
 *  - threejs-postprocessing: EffectComposer → RenderPass → UnrealBloomPass → GammaCorrectionShader
 *  - threejs-interaction  : mousemove world-space conversion for parallax camera tilt
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer }        from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }             from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass }        from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass }             from 'three/addons/postprocessing/ShaderPass.js';
import { GammaCorrectionShader }  from 'three/addons/shaders/GammaCorrectionShader.js';


// ─── Constellation Points Shaders ───────────────────────────────────────────
const pointsVertexShader = /* glsl */`
  uniform float uTime;
  attribute float aPhase;    // per-particle phase offset
  attribute float aSpeed;    // per-particle drift speed
  varying float  vAlpha;

  void main(){
    vec3 pos = position;
    // Gentle individual float (threejs-animation: oscillation pattern)
    pos.y += sin(uTime * aSpeed + aPhase) * 0.12;
    pos.x += cos(uTime * aSpeed * 0.7 + aPhase * 1.3) * 0.08;

    // Fade by depth
    vAlpha = 0.4 + 0.3 * sin(uTime * 0.5 + aPhase);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = (80.0 / -mv.z) * (0.6 + 0.4 * vAlpha);
    gl_Position  = projectionMatrix * mv;
  }
`;

const pointsFragmentShader = /* glsl */`
  uniform vec3  uStarColor;
  varying float vAlpha;

  void main(){
    // Circular soft dot
    vec2  uv   = gl_PointCoord - 0.5;
    float d    = length(uv);
    float mask = 1. - smoothstep(0.35, 0.5, d);
    if(mask < 0.01) discard;
    gl_FragColor = vec4(uStarColor, mask * vAlpha * 0.7);
  }
`;

// ─── Spring class (threejs-animation: spring physics) ───────────────────────
class Spring {
  constructor(stiffness = 80, damping = 14) {
    this.stiffness = stiffness;
    this.damping   = damping;
    this.position  = 0;
    this.velocity  = 0;
    this.target    = 0;
  }
  update(dt) {
    const force        = -this.stiffness * (this.position - this.target);
    const dampingForce = -this.damping   * this.velocity;
    this.velocity     += (force + dampingForce) * dt;
    this.position     += this.velocity * dt;
    return this.position;
  }
}

// ─── Hex → THREE.Color ───────────────────────────────────────────────────────
function hexToColor(hex) {
  const c = hex.replace('#', '');
  return new THREE.Color(
    parseInt(c.slice(0,2),16)/255,
    parseInt(c.slice(2,4),16)/255,
    parseInt(c.slice(4,6),16)/255,
  );
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function ThreeBackground({ theme }) {
  const mountRef = useRef(null);
  const themeRef = useRef(theme);

  useEffect(() => { themeRef.current = theme; }, [theme]);

  useEffect(() => {
    const container = mountRef.current;
    const W = window.innerWidth;
    const H = window.innerHeight;

    // ── Renderer (threejs-fundamentals) ─────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      powerPreference: 'low-power',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;  // fundamentals: output colorspace

    const canvas = renderer.domElement;
    Object.assign(canvas.style, {
      position: 'fixed', top: '0', left: '0',
      width: '100%', height: '100%',
      zIndex: '0', pointerEvents: 'none',
    });
    container.appendChild(canvas);

    const scene  = new THREE.Scene();
    // fundamentals: PerspectiveCamera setup
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    camera.position.set(0, 0, 5);

    // ── THREE.Clock (threejs-fundamentals: Clock for animation) ─────────────
    const clock = new THREE.Clock();

    const t = themeRef.current;

    // ── Target Watermark (threejs-geometry: RingGeometry + LineSegments) ─────
    // Concentric rings + crosshair, sitting far behind everything.
    const targetGroup   = new THREE.Group();
    targetGroup.position.z = -1.2;  // push behind
    scene.add(targetGroup);

    // Shared watermark material — theme color, increased opacity for visibility
    const targetColor = hexToColor(t.button || '#bb86fc');
    const ringMat = new THREE.MeshBasicMaterial({
      color:       targetColor,
      transparent: true,
      opacity:     0.15,
      side:        THREE.DoubleSide,
      depthWrite:  false,
    });

    // Concentric rings at increasing radii
    const RING_RADII = [0.55, 1.1, 1.75, 2.5, 3.4, 4.5];
    const ringGeos   = [];
    RING_RADII.forEach((r, i) => {
      const innerR  = r - 0.018;         // thin ring stroke
      const ringGeo = new THREE.RingGeometry(innerR, r, 96);
      ringGeos.push(ringGeo);
      const ring    = new THREE.Mesh(ringGeo, ringMat);
      // Alternate rings slightly smaller opacity for depth variation
      ring.renderOrder = -1;
      targetGroup.add(ring);
    });

    // Central dot
    const dotGeo = new THREE.CircleGeometry(0.055, 32);
    ringGeos.push(dotGeo);
    targetGroup.add(new THREE.Mesh(dotGeo, ringMat));

    // Crosshair lines (LineSegments — geometry skill)
    const crosshairPoints = new Float32Array([
      // horizontal bar (full width, gap in center)
      -4.8,  0, 0,   -0.18, 0, 0,
       0.18, 0, 0,    4.8,  0, 0,
      // vertical bar
       0, -4.8, 0,    0, -0.18, 0,
       0,  0.18, 0,   0,  4.8,  0,
      // Tick marks at each ring radius
      ...RING_RADII.flatMap(r => [
         r - 0.12, -0.04, 0,  r - 0.12,  0.04, 0,  // right tick
        -r + 0.12, -0.04, 0, -r + 0.12,  0.04, 0,  // left tick
         0.04, r  - 0.12, 0, -0.04, r  - 0.12, 0,  // top tick
         0.04, -r + 0.12, 0, -0.04, -r + 0.12, 0,  // bottom tick
      ]),
    ]);

    const crossGeo = new THREE.BufferGeometry();
    crossGeo.setAttribute('position', new THREE.BufferAttribute(crosshairPoints, 3));

    const crossMat = new THREE.LineBasicMaterial({
      color:       targetColor.clone(),
      transparent: true,
      opacity:     0.18,
      depthWrite:  false,
    });

    const crosshair = new THREE.LineSegments(crossGeo, crossMat);
    crosshair.renderOrder = -1;
    targetGroup.add(crosshair);


    // ── Constellation Points (threejs-geometry: BufferGeometry Points) ───────
    const STAR_COUNT = 120;
    const starGeo    = new THREE.BufferGeometry();
    const starPos    = new Float32Array(STAR_COUNT * 3);
    const starPhase  = new Float32Array(STAR_COUNT);
    const starSpeed  = new Float32Array(STAR_COUNT);

    for (let i = 0; i < STAR_COUNT; i++) {
      starPos[i*3]   = (Math.random() - 0.5) * 18;
      starPos[i*3+1] = (Math.random() - 0.5) * 11;
      starPos[i*3+2] = (Math.random() - 0.5) * 2 - 0.5;
      starPhase[i]   = Math.random() * Math.PI * 2;
      starSpeed[i]   = 0.4 + Math.random() * 0.8;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos,   3));
    starGeo.setAttribute('aPhase',   new THREE.BufferAttribute(starPhase, 1));
    starGeo.setAttribute('aSpeed',   new THREE.BufferAttribute(starSpeed,  1));

    const starUniforms = {
      uTime:      { value: 0 },
      uStarColor: { value: hexToColor(t.highlight || '#ffffff') },
    };

    const starMat = new THREE.ShaderMaterial({
      vertexShader:   pointsVertexShader,
      fragmentShader: pointsFragmentShader,
      uniforms:       starUniforms,
      transparent:    true,
      depthWrite:     false,
      blending:       THREE.AdditiveBlending,  // shaders: additive blending for glow
    });

    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // ── Post-Processing (threejs-postprocessing) ─────────────────────────────
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    // Subtle bloom — makes the warp mesh edges and star points glow
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(W, H),
      0.35,   // strength — very subtle, not overwhelming
      0.5,    // radius
      0.82,   // threshold — only bright parts bloom
    );
    composer.addPass(bloomPass);

    // Gamma correction (fundamentals: outputColorSpace + postprocessing)
    composer.addPass(new ShaderPass(GammaCorrectionShader));

    // ── Spring Physics for Camera Tilt (threejs-animation: Spring class) ─────
    const springX = new Spring(60, 12);
    const springY = new Spring(60, 12);

    // ── Mouse Tracking (threejs-interaction: mouse position conversion) ───────
    const mouse = { nx: 0, ny: 0 };  // normalized -1..1

    const onMouseMove = (e) => {
      mouse.nx = (e.clientX / window.innerWidth)  * 2 - 1;
      mouse.ny = -(e.clientY / window.innerHeight) * 2 + 1;
      springX.target = mouse.nx * 0.12;   // subtle tilt
      springY.target = mouse.ny * 0.08;
    };
    window.addEventListener('mousemove', onMouseMove, { passive: true });

    // ── Resize Handler (threejs-fundamentals: responsive canvas) ─────────────
    const onResize = () => {
      const nW = window.innerWidth;
      const nH = window.innerHeight;
      camera.aspect = nW / nH;
      camera.updateProjectionMatrix();
      renderer.setSize(nW, nH);
      composer.setSize(nW, nH);          // postprocessing: resize composer too
      bloomPass.resolution.set(nW, nH);
    };
    window.addEventListener('resize', onResize, { passive: true });

    // ── Lerp helper for Color objects ────────────────────────────────────────
    const lerpColor = (cur, tgt, a) => {
      cur.r += (tgt.r - cur.r) * a;
      cur.g += (tgt.g - cur.g) * a;
      cur.b += (tgt.b - cur.b) * a;
    };

    // ── Animation Loop (threejs-fundamentals: Clock + RAF) ───────────────────
    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      // clock.getDelta() — proper frame-rate-independent timing
      const delta   = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Update time uniforms
      starUniforms.uTime.value  = elapsed;

      // Spring physics for camera tilt (animation: Spring.update(dt))
      camera.rotation.y = springX.update(delta);
      camera.rotation.x = springY.update(delta);

      // Target watermark: imperceptibly slow rotation (~3 min per revolution)
      // Plus a very subtle breath (scale pulse)
      targetGroup.rotation.z = elapsed * 0.0035;
      const breathe = 1 + Math.sin(elapsed * 0.25) * 0.008;
      targetGroup.scale.setScalar(breathe);

      // Current theme (read once per frame for all color lerps)
      const ct = themeRef.current;

      // Lerp target watermark color toward theme button color
      const targetThemeColor = hexToColor(ct.button || '#bb86fc');
      lerpColor(ringMat.color,  targetThemeColor, 0.02);
      lerpColor(crossMat.color, targetThemeColor, 0.02);

      // Smooth star color transitions
      lerpColor(starUniforms.uStarColor.value, hexToColor(ct.highlight || '#ffffff'), 0.025);


      // Use composer (postprocessing) instead of renderer.render directly
      composer.render(delta);
    };
    animate();

    // ── Cleanup (threejs-fundamentals: proper dispose pattern) ───────────────
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize',    onResize);
      ringGeos.forEach(g => g.dispose());
      ringMat.dispose();
      crossGeo.dispose();
      crossMat.dispose();
      starGeo.dispose();
      starMat.dispose();
      composer.dispose();
      renderer.dispose();
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={mountRef}
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
    />
  );
}
