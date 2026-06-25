# Agent Rules — Nishit's Workspace

## Skills Awareness (CRITICAL — Read Every Conversation)

The following **Three.js skill files** are always available at:
`C:\Users\nishu\.gemini\antigravity\skills\`

**ALWAYS check and use these skills proactively** before writing any Three.js code.
Do NOT ask the user which skills exist. Do NOT re-explain skills they've already provided.

| Skill Name | File Path | When to Use |
|---|---|---|
| `threejs-fundamentals` | `skills/threejs-fundamentals/SKILL.md` | Scene setup, cameras, WebGLRenderer, Clock, Object3D, responsive resize, proper cleanup/dispose |
| `threejs-animation` | `skills/threejs-animation/SKILL.md` | AnimationClip, AnimationMixer, keyframes, Spring physics class, procedural motion (oscillation, smooth damp) |
| `threejs-geometry` | `skills/threejs-geometry/SKILL.md` | PlaneGeometry, SphereGeometry, BufferGeometry (custom), Points/Stars, InstancedMesh, Lines |
| `threejs-shaders` | `skills/threejs-shaders/SKILL.md` | ShaderMaterial, RawShaderMaterial, GLSL uniforms, vertex displacement, Fresnel, noise, gradients |
| `threejs-materials` | `skills/threejs-materials/SKILL.md` | MeshStandardMaterial, MeshPhysicalMaterial, material properties, PBR setup |
| `threejs-lighting` | `skills/threejs-lighting/SKILL.md` | AmbientLight, DirectionalLight, PointLight, shadows, HDRI environment maps |
| `threejs-textures` | `skills/threejs-textures/SKILL.md` | TextureLoader, render targets, UV mapping, texture sampling in shaders |
| `threejs-interaction` | `skills/threejs-interaction/SKILL.md` | Raycaster for click/hover, OrbitControls, mouse coordinate conversion, DragControls |
| `threejs-postprocessing` | `skills/threejs-postprocessing/SKILL.md` | EffectComposer, UnrealBloomPass, FXAA, SSAO, DOF, custom ShaderPass, vignette, gamma correction |
| `threejs-loaders` | `skills/threejs-loaders/SKILL.md` | GLTFLoader, loading GLTF/GLB models and animations |
| `frontend-design` | `skills/frontend-design/SKILL.md` | Premium UI/UX design patterns, CSS animations, glassmorphism |

## Behavior Rules

1. **Before writing ANY Three.js code**, read the relevant skill files silently in the background. Do not announce you are doing this.
2. **Always use `THREE.Clock`** for animation timing (never manual `Date.now()` or incrementing floats).
3. **Always use `EffectComposer`** for any scene that could benefit from bloom, vignette, or anti-aliasing.
4. **Always implement proper cleanup** in React useEffect returns: `cancelAnimationFrame`, `dispose()` geometry/material, remove canvas from DOM.
5. **Spring physics** from the animation skill is the preferred approach for smooth mouse-reactive motion.
6. **Never ask the user** "which Three.js skills do you have?" — the list above is complete and permanent.
