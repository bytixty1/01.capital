import * as THREE from 'three';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { VignetteShader } from 'three/examples/jsm/shaders/VignetteShader.js';
import { RGBShiftShader } from 'three/examples/jsm/shaders/RGBShiftShader.js';
import type { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import type { PerfTier } from './types';

// react-force-graph-3d owns the render loop (it is NOT react-three-fiber, so
// @react-three/postprocessing's <EffectComposer> cannot mount here). We get the
// same look by pushing passes onto the graph's built-in EffectComposer:
// bloom is what turns emissive meshes into stars.
export function setupPostProcessing(composer: EffectComposer, tier: PerfTier): void {
  // >1000 nodes → medium bloom kernel (smaller radius), per the perf rules.
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    tier === 'low' ? 1.25 : 1.6, // strength
    tier === 'low' ? 0.4 : 0.7, // radius (kernel spread)
    0.25, // luminance threshold
  );
  composer.addPass(bloom);

  // >1000 nodes → chromatic aberration disabled, per the perf rules.
  if (tier === 'high') {
    const rgbShift = new ShaderPass(RGBShiftShader);
    rgbShift.uniforms['amount'].value = 0.0006;
    composer.addPass(rgbShift);
  }

  const vignette = new ShaderPass(VignetteShader);
  vignette.uniforms['offset'].value = 1.05;
  vignette.uniforms['darkness'].value = 1.15;
  composer.addPass(vignette);
}
