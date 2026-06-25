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

// ─── Simplex Noise (Inlined — no external dep) ──────────────────────────────
const GLSL_SIMPLEX_3D = /* glsl */`
vec3 mod289v3(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289v4(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289v4(((x*34.)+1.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}

float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.);
  const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289v3(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.;
  vec4 s1=floor(b1)*2.+1.;
  vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);
  m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

// ─── Warp Mesh Shaders ───────────────────────────────────────────────────────
const warpVertexShader = /* glsl */`
  ${GLSL_SIMPLEX_3D}

  uniform float uTime;
  uniform vec2  uMouse;      // 0..1 normalized
  varying vec2  vUv;
  varying float vElevation;

  void main(){
    vUv = uv;

    // Base slow noise layers (threejs-shaders: vertex displacement pattern)
    float n  = snoise(vec3(position.x * 0.35, position.y * 0.35, uTime * 0.10)) * 0.45;
          n += snoise(vec3(position.x * 0.70, position.y * 0.70, uTime * 0.17 + 3.)) * 0.20;

    // Mouse turbulence (threejs-interaction: mouse-to-world influence)
    vec2  mOff     = uMouse - (uv - 0.5);
    float mWeight  = 1. - clamp(length(mOff) * 2.5, 0., 1.);
    float mNoise   = snoise(vec3(position.x * 1.1, position.y * 1.1, uTime * 0.35 + 7.));
          n += mWeight * mNoise * 0.18;

    vElevation = n;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position.x, position.y, n, 1.0);
  }
`;

const warpFragmentShader = /* glsl */`
  uniform vec3  uColor1;
  uniform vec3  uColor2;
  uniform vec3  uColor3;
  varying vec2  vUv;
  varying float vElevation;

  void main(){
    float t   = clamp((vElevation + 0.45) * 1.1, 0., 1.);

    // Three-stop gradient (threejs-shaders: gradient pattern)
    vec3 col  = mix(uColor1, uColor2, smoothstep(0., 0.5, t));
         col  = mix(col,     uColor3, smoothstep(0.5, 1., t));

    // Radial vignette — fade to transparency at edges
    vec2  c    = vUv - 0.5;
    float vig  = 1. - smoothstep(0.25, 0.75, length(c));

    // Very low alpha — subliminal, tasteful (user vision)
    gl_FragColor = vec4(col, vig * 0.055);
  }
`;

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

    // ── Warp Mesh (threejs-shaders + threejs-geometry) ───────────────────────
    const warpGeo = new THREE.PlaneGeometry(16, 10, 90, 55);

    const t = themeRef.current;
    const warpUniforms = {
      uTime:   { value: 0 },
      uMouse:  { value: new THREE.Vector2(0.5, 0.5) },
      uColor1: { value: hexToColor(t.orb1     || '#bb86fc') },
      uColor2: { value: hexToColor(t.orb2     || '#03dac6') },
      uColor3: { value: hexToColor(t.highlight || '#ffffff') },
    };

    const warpMat = new THREE.ShaderMaterial({
      vertexShader:   warpVertexShader,
      fragmentShader: warpFragmentShader,
      uniforms:       warpUniforms,
      transparent:    true,
      side:           THREE.DoubleSide,
      depthWrite:     false,
    });

    const warpMesh = new THREE.Mesh(warpGeo, warpMat);
    scene.add(warpMesh);

    // ── Target Watermark (threejs-geometry: RingGeometry + LineSegments) ─────
    // Concentric rings + crosshair, sitting far behind everything.
    // Opacity is ~4–5% so it reads as a pure subliminal watermark.
    const targetGroup   = new THREE.Group();
    targetGroup.position.z = -1.2;  // push behind warp mesh
    scene.add(targetGroup);

    // Shared watermark material — very low opacity, theme color
    const targetColor = hexToColor(t.button || '#bb86fc');
    const ringMat = new THREE.MeshBasicMaterial({
      color:       targetColor,
      transparent: true,
      opacity:     0.045,
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
      opacity:     0.055,
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
    const mouse      = { nx: 0, ny: 0 };  // normalized -1..1
    const meshMouse  = { x: 0.5, y: 0.5 };// 0..1 for shader uMouse

    const onMouseMove = (e) => {
      mouse.nx = (e.clientX / window.innerWidth)  * 2 - 1;
      mouse.ny = -(e.clientY / window.innerHeight) * 2 + 1;
      springX.target = mouse.nx * 0.12;   // subtle tilt
      springY.target = mouse.ny * 0.08;
      meshMouse.x = e.clientX / window.innerWidth;
      meshMouse.y = 1 - e.clientY / window.innerHeight;
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
      warpUniforms.uTime.value  = elapsed;
      starUniforms.uTime.value  = elapsed;

      // Smooth mouse → shader (lerp)
      warpUniforms.uMouse.value.x += (meshMouse.x - warpUniforms.uMouse.value.x) * 0.05;
      warpUniforms.uMouse.value.y += (meshMouse.y - warpUniforms.uMouse.value.y) * 0.05;

      // Spring physics for camera tilt (animation: Spring.update(dt))
      camera.rotation.y = springX.update(delta);
      camera.rotation.x = springY.update(delta);

      // Gentle mesh breathe / drift
      warpMesh.rotation.z = Math.sin(elapsed * 0.04) * 0.025;

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

      // Smooth warp mesh + star color transitions
      lerpColor(warpUniforms.uColor1.value, hexToColor(ct.orb1     || '#bb86fc'), 0.025);
      lerpColor(warpUniforms.uColor2.value, hexToColor(ct.orb2     || '#03dac6'), 0.025);
      lerpColor(warpUniforms.uColor3.value, hexToColor(ct.highlight || '#ffffff'), 0.025);
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
      warpGeo.dispose();
      warpMat.dispose();
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
