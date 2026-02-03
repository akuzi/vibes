'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import { ImageVolume } from '@/lib/nifti-viewer/types';
import { ColorMap, applyColorMap } from '@/lib/nifti-viewer/colorMaps';

interface VolumeRendererProps {
  volume: ImageVolume;
  enabled: boolean;
  renderMode: 'mip' | 'isosurface';
  colorMap: ColorMap;
  overlay?: ImageVolume;
  overlayColorMap?: ColorMap;
  overlayOpacity?: number;
}

// Vertex shader for ray marching
const vertexShader = `
  varying vec3 vOrigin;
  varying vec3 vDirection;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vOrigin = vec3(inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;
    vDirection = position - vOrigin;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

// Fragment shader for MIP rendering
const fragmentShaderMIP = `
  precision highp float;
  precision highp sampler3D;

  uniform sampler3D uVolume;
  uniform sampler2D uColorMap;
  uniform vec3 uVolumeSize;
  uniform float uThreshold;
  uniform sampler3D uOverlay;
  uniform sampler2D uOverlayColorMap;
  uniform float uOverlayOpacity;
  uniform bool uHasOverlay;

  varying vec3 vOrigin;
  varying vec3 vDirection;

  vec2 hitBox(vec3 orig, vec3 dir) {
    vec3 box_min = vec3(-0.5);
    vec3 box_max = vec3(0.5);
    vec3 inv_dir = 1.0 / dir;
    vec3 tmin_tmp = (box_min - orig) * inv_dir;
    vec3 tmax_tmp = (box_max - orig) * inv_dir;
    vec3 tmin = min(tmin_tmp, tmax_tmp);
    vec3 tmax = max(tmin_tmp, tmax_tmp);
    float t0 = max(tmin.x, max(tmin.y, tmin.z));
    float t1 = min(tmax.x, min(tmax.y, tmax.z));
    return vec2(t0, t1);
  }

  float sample1(vec3 p) {
    return texture(uVolume, p + 0.5).r;
  }

  float sampleOverlay(vec3 p) {
    return texture(uOverlay, p + 0.5).r;
  }

  vec3 applyColorMap(float value) {
    return texture2D(uColorMap, vec2(clamp(value, 0.0, 1.0), 0.5)).rgb;
  }

  vec3 applyOverlayColorMap(float value) {
    return texture2D(uOverlayColorMap, vec2(clamp(value, 0.0, 1.0), 0.5)).rgb;
  }

  void main() {
    vec3 rayDir = normalize(vDirection);
    vec2 bounds = hitBox(vOrigin, rayDir);

    if (bounds.x > bounds.y) {
      discard;
    }

    bounds.x = max(bounds.x, 0.0);

    vec3 p = vOrigin + bounds.x * rayDir;
    vec3 inc = 1.0 / abs(rayDir);
    float delta = min(inc.x, min(inc.y, inc.z)) / max(uVolumeSize.x, max(uVolumeSize.y, uVolumeSize.z));
    delta = min(delta, 0.01);

    float maxVal = 0.0;
    float maxOverlayVal = 0.0;
    for (float t = bounds.x; t < bounds.y; t += delta) {
      float val = sample1(p);
      maxVal = max(maxVal, val);
      if (uHasOverlay) {
        float oVal = sampleOverlay(p);
        maxOverlayVal = max(maxOverlayVal, oVal);
      }
      p += rayDir * delta;
    }

    vec3 color = applyColorMap(maxVal);
    if (uHasOverlay && maxOverlayVal > 0.01) {
      vec3 oColor = applyOverlayColorMap(maxOverlayVal);
      color = mix(color, oColor, uOverlayOpacity);
    }
    gl_FragColor = vec4(color, 1.0);
  }
`;

// Fragment shader for isosurface rendering
const fragmentShaderIso = `
  precision highp float;
  precision highp sampler3D;

  uniform sampler3D uVolume;
  uniform sampler2D uColorMap;
  uniform vec3 uVolumeSize;
  uniform float uThreshold;
  uniform sampler3D uOverlay;
  uniform sampler2D uOverlayColorMap;
  uniform float uOverlayOpacity;
  uniform bool uHasOverlay;

  varying vec3 vOrigin;
  varying vec3 vDirection;

  vec2 hitBox(vec3 orig, vec3 dir) {
    vec3 box_min = vec3(-0.5);
    vec3 box_max = vec3(0.5);
    vec3 inv_dir = 1.0 / dir;
    vec3 tmin_tmp = (box_min - orig) * inv_dir;
    vec3 tmax_tmp = (box_max - orig) * inv_dir;
    vec3 tmin = min(tmin_tmp, tmax_tmp);
    vec3 tmax = max(tmin_tmp, tmax_tmp);
    float t0 = max(tmin.x, max(tmin.y, tmin.z));
    float t1 = min(tmax.x, min(tmax.y, tmax.z));
    return vec2(t0, t1);
  }

  float sample1(vec3 p) {
    return texture(uVolume, p + 0.5).r;
  }

  float sampleOverlay(vec3 p) {
    return texture(uOverlay, p + 0.5).r;
  }

  vec3 getNormal(vec3 p) {
    float eps = 0.01;
    vec3 n;
    n.x = sample1(vec3(p.x + eps, p.y, p.z)) - sample1(vec3(p.x - eps, p.y, p.z));
    n.y = sample1(vec3(p.x, p.y + eps, p.z)) - sample1(vec3(p.x, p.y - eps, p.z));
    n.z = sample1(vec3(p.x, p.y, p.z + eps)) - sample1(vec3(p.x, p.y, p.z - eps));
    return normalize(n);
  }

  vec3 applyColorMap(float value) {
    return texture2D(uColorMap, vec2(clamp(value, 0.0, 1.0), 0.5)).rgb;
  }

  vec3 applyOverlayColorMap(float value) {
    return texture2D(uOverlayColorMap, vec2(clamp(value, 0.0, 1.0), 0.5)).rgb;
  }

  void main() {
    vec3 rayDir = normalize(vDirection);
    vec2 bounds = hitBox(vOrigin, rayDir);

    if (bounds.x > bounds.y) {
      discard;
    }

    bounds.x = max(bounds.x, 0.0);

    vec3 p = vOrigin + bounds.x * rayDir;
    vec3 inc = 1.0 / abs(rayDir);
    float delta = min(inc.x, min(inc.y, inc.z)) / max(uVolumeSize.x, max(uVolumeSize.y, uVolumeSize.z));
    delta = min(delta, 0.005);

    vec4 color = vec4(0.0);

    for (float t = bounds.x; t < bounds.y; t += delta) {
      float val = sample1(p);

      if (val > uThreshold) {
        vec3 normal = getNormal(p);
        vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
        float diff = max(dot(normal, lightDir), 0.3);
        vec3 baseColor = applyColorMap(val);
        vec3 surfaceColor = baseColor * 0.8 * diff;

        if (uHasOverlay) {
          float oVal = sampleOverlay(p);
          if (oVal > 0.01) {
            vec3 oColor = applyOverlayColorMap(oVal);
            surfaceColor = mix(surfaceColor, oColor, uOverlayOpacity);
          }
        }

        color = vec4(surfaceColor, 1.0);
        break;
      }

      p += rayDir * delta;
    }

    if (color.a == 0.0) {
      discard;
    }

    gl_FragColor = color;
  }
`;

export default function VolumeRenderer({
  volume,
  enabled,
  renderMode,
  colorMap,
  overlay,
  overlayColorMap = 'jet',
  overlayOpacity = 0.5,
}: VolumeRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const textureRef = useRef<THREE.Data3DTexture | null>(null);
  const colorMapTextureRef = useRef<THREE.DataTexture | null>(null);
  const overlayTextureRef = useRef<THREE.Data3DTexture | null>(null);
  const overlayColorMapTextureRef = useRef<THREE.DataTexture | null>(null);
  const frameIdRef = useRef<number>(0);

  // Create 3D texture from volume data
  const createVolumeTexture = useCallback(
    (vol: ImageVolume): THREE.Data3DTexture => {
      const [dimX, dimY, dimZ] = vol.dims;

      // Normalize data to 0-1 range
      const normalizedData = new Float32Array(vol.data.length);
      const range = vol.maxValue - vol.minValue;
      for (let i = 0; i < vol.data.length; i++) {
        normalizedData[i] = (vol.data[i] - vol.minValue) / range;
      }

      const texture = new THREE.Data3DTexture(normalizedData, dimX, dimY, dimZ);
      texture.format = THREE.RedFormat;
      texture.type = THREE.FloatType;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.wrapR = THREE.ClampToEdgeWrapping;
      texture.needsUpdate = true;

      return texture;
    },
    []
  );

  // Create 1D color map texture
  const createColorMapTexture = useCallback(
    (map: ColorMap): THREE.DataTexture => {
      const width = 256;
      const data = new Uint8Array(width * 4);

      for (let i = 0; i < width; i++) {
        const value = i / (width - 1);
        const [r, g, b] = applyColorMap(value, map);
        const idx = i * 4;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;
      }

      const texture = new THREE.DataTexture(data, width, 1);
      texture.format = THREE.RGBAFormat;
      texture.type = THREE.UnsignedByteType;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.needsUpdate = true;

      return texture;
    },
    []
  );

  // Initialize Three.js scene
  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 2);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    // Create volume texture
    const texture = createVolumeTexture(volume);
    textureRef.current = texture;

    // Create color map texture
    const colorMapTexture = createColorMapTexture(colorMap);
    colorMapTextureRef.current = colorMapTexture;

    // Create overlay textures (use a 1x1x1 dummy if no overlay)
    let overlayTexture: THREE.Data3DTexture;
    if (overlay) {
      overlayTexture = createVolumeTexture(overlay);
    } else {
      const dummyData = new Float32Array(1);
      overlayTexture = new THREE.Data3DTexture(dummyData, 1, 1, 1);
      overlayTexture.format = THREE.RedFormat;
      overlayTexture.type = THREE.FloatType;
      overlayTexture.needsUpdate = true;
    }
    overlayTextureRef.current = overlayTexture;

    const overlayColorMapTexture = createColorMapTexture(overlayColorMap);
    overlayColorMapTextureRef.current = overlayColorMapTexture;

    // Create volume mesh
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uVolume: { value: texture },
        uColorMap: { value: colorMapTexture },
        uVolumeSize: {
          value: new THREE.Vector3(volume.dims[0], volume.dims[1], volume.dims[2]),
        },
        uThreshold: { value: 0.3 },
        uOverlay: { value: overlayTexture },
        uOverlayColorMap: { value: overlayColorMapTexture },
        uOverlayOpacity: { value: overlayOpacity },
        uHasOverlay: { value: !!overlay },
      },
      vertexShader,
      fragmentShader: renderMode === 'mip' ? fragmentShaderMIP : fragmentShaderIso,
      side: THREE.BackSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    meshRef.current = mesh;

    // Animation loop
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Cleanup
    return () => {
      cancelAnimationFrame(frameIdRef.current);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      texture.dispose();
      overlayTexture.dispose();
      if (colorMapTextureRef.current) {
        colorMapTextureRef.current.dispose();
      }
      if (overlayColorMapTextureRef.current) {
        overlayColorMapTextureRef.current.dispose();
      }
      container.removeChild(renderer.domElement);

      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
      meshRef.current = null;
      textureRef.current = null;
      colorMapTextureRef.current = null;
      overlayTextureRef.current = null;
      overlayColorMapTextureRef.current = null;
    };
  }, [enabled, volume, overlay, createVolumeTexture, createColorMapTexture, renderMode, colorMap, overlayColorMap, overlayOpacity]);

  // Update shader when render mode changes
  useEffect(() => {
    if (meshRef.current && meshRef.current.material instanceof THREE.ShaderMaterial) {
      meshRef.current.material.fragmentShader =
        renderMode === 'mip' ? fragmentShaderMIP : fragmentShaderIso;
      meshRef.current.material.needsUpdate = true;
    }
  }, [renderMode]);

  // Update color map texture when it changes
  useEffect(() => {
    if (meshRef.current && meshRef.current.material instanceof THREE.ShaderMaterial) {
      const colorMapTexture = createColorMapTexture(colorMap);
      if (colorMapTextureRef.current) {
        colorMapTextureRef.current.dispose();
      }
      colorMapTextureRef.current = colorMapTexture;
      meshRef.current.material.uniforms.uColorMap.value = colorMapTexture;
    }
  }, [colorMap, createColorMapTexture]);

  // Update overlay colormap texture when it changes
  useEffect(() => {
    if (meshRef.current && meshRef.current.material instanceof THREE.ShaderMaterial) {
      const tex = createColorMapTexture(overlayColorMap);
      if (overlayColorMapTextureRef.current) {
        overlayColorMapTextureRef.current.dispose();
      }
      overlayColorMapTextureRef.current = tex;
      meshRef.current.material.uniforms.uOverlayColorMap.value = tex;
    }
  }, [overlayColorMap, createColorMapTexture]);

  // Update overlay opacity uniform reactively
  useEffect(() => {
    if (meshRef.current && meshRef.current.material instanceof THREE.ShaderMaterial) {
      meshRef.current.material.uniforms.uOverlayOpacity.value = overlayOpacity;
    }
  }, [overlayOpacity]);

  // Auto-rotate state
  const [autoRotateAxis, setAutoRotateAxis] = useState<'x' | 'y' | 'z' | null>(null);

  useEffect(() => {
    if (!controlsRef.current) return;
    controlsRef.current.autoRotate = autoRotateAxis !== null;
    controlsRef.current.autoRotateSpeed = 4.0;
  }, [autoRotateAxis]);

  useEffect(() => {
    if (!controlsRef.current || !cameraRef.current || autoRotateAxis === null) return;

    const controls = controlsRef.current;
    // OrbitControls rotates around Y by default. To rotate around X or Z,
    // we tilt the polar axis so autoRotate orbits the desired axis.
    switch (autoRotateAxis) {
      case 'y':
        // Default OrbitControls behavior — orbit around world Y
        controls.target.set(0, 0, 0);
        break;
      case 'x':
        // Position camera to look along Z, then auto-rotate gives X-axis rotation feel
        cameraRef.current.position.set(0, 0, 2);
        cameraRef.current.up.set(0, 0, 1);
        controls.target.set(0, 0, 0);
        break;
      case 'z':
        cameraRef.current.position.set(0, 2, 0);
        cameraRef.current.up.set(1, 0, 0);
        controls.target.set(0, 0, 0);
        break;
    }
    controls.update();
  }, [autoRotateAxis]);

  const setCameraView = useCallback((axis: 'x' | 'y' | 'z' | '-x' | '-y' | '-z') => {
    if (!cameraRef.current || !controlsRef.current) return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const dist = 2;

    // Reset up vector and stop auto-rotate
    camera.up.set(0, 1, 0);
    setAutoRotateAxis(null);

    switch (axis) {
      case 'x':
        camera.position.set(dist, 0, 0);
        break;
      case '-x':
        camera.position.set(-dist, 0, 0);
        break;
      case 'y':
        camera.position.set(0, dist, 0);
        camera.up.set(0, 0, -1);
        break;
      case '-y':
        camera.position.set(0, -dist, 0);
        camera.up.set(0, 0, 1);
        break;
      case 'z':
        camera.position.set(0, 0, dist);
        break;
      case '-z':
        camera.position.set(0, 0, -dist);
        break;
    }
    controls.target.set(0, 0, 0);
    controls.update();
  }, []);

  const toggleAutoRotate = useCallback((axis: 'x' | 'y' | 'z') => {
    setAutoRotateAxis((prev) => (prev === axis ? null : axis));
  }, []);

  if (!enabled) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900 rounded-lg border border-gray-700">
        <p className="text-gray-300 text-sm">3D view disabled</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full" style={{ minHeight: 300 }}>
      <div
        ref={containerRef}
        className="w-full h-full rounded-lg overflow-hidden"
      />
      {/* Axis view controls */}
      <div className="absolute bottom-3 left-3 flex gap-1.5">
        {/* Snap-to-axis buttons */}
        {(['x', 'y', 'z'] as const).map((axis) => (
          <div key={axis} className="flex flex-col gap-1">
            <button
              onClick={() => setCameraView(axis)}
              className="px-2 py-1 text-xs font-mono bg-black/60 hover:bg-black/80 text-gray-200 hover:text-white rounded transition-colors border border-gray-600 hover:border-gray-400"
              title={`View along +${axis.toUpperCase()}`}
            >
              +{axis.toUpperCase()}
            </button>
            <button
              onClick={() => setCameraView(`-${axis}` as `-x` | `-y` | `-z`)}
              className="px-2 py-1 text-xs font-mono bg-black/60 hover:bg-black/80 text-gray-200 hover:text-white rounded transition-colors border border-gray-600 hover:border-gray-400"
              title={`View along -${axis.toUpperCase()}`}
            >
              -{axis.toUpperCase()}
            </button>
          </div>
        ))}
        {/* Divider */}
        <div className="w-px bg-gray-600 mx-1" />
        {/* Auto-rotate buttons */}
        {(['x', 'y', 'z'] as const).map((axis) => (
          <button
            key={`rot-${axis}`}
            onClick={() => toggleAutoRotate(axis)}
            className={`px-2 py-1 text-xs font-mono rounded transition-colors border ${
              autoRotateAxis === axis
                ? 'bg-blue-600/80 border-blue-400 text-white'
                : 'bg-black/60 hover:bg-black/80 text-gray-200 hover:text-white border-gray-600 hover:border-gray-400'
            }`}
            title={`Auto-rotate around ${axis.toUpperCase()}`}
          >
            {autoRotateAxis === axis ? `\u21BB${axis.toUpperCase()}` : `\u21BB${axis.toUpperCase()}`}
          </button>
        ))}
      </div>
    </div>
  );
}
