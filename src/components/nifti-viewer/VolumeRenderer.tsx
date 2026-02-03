'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import { ImageVolume } from '@/lib/nifti-viewer/types';
import { ColorMap, applyColorMap } from '@/lib/nifti-viewer/colorMaps';

interface VolumeRendererProps {
  volume: ImageVolume;
  enabled: boolean;
  renderMode: 'mip' | 'isosurface';
  colorMap: ColorMap;
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

  vec3 applyColorMap(float value) {
    return texture2D(uColorMap, vec2(clamp(value, 0.0, 1.0), 0.5)).rgb;
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
    for (float t = bounds.x; t < bounds.y; t += delta) {
      float val = sample1(p);
      maxVal = max(maxVal, val);
      p += rayDir * delta;
    }

    vec3 color = applyColorMap(maxVal);
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
        color = vec4(baseColor * 0.8 * diff, 1.0);
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
}: VolumeRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const textureRef = useRef<THREE.Data3DTexture | null>(null);
  const colorMapTextureRef = useRef<THREE.DataTexture | null>(null);
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
      if (colorMapTextureRef.current) {
        colorMapTextureRef.current.dispose();
      }
      container.removeChild(renderer.domElement);

      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
      meshRef.current = null;
      textureRef.current = null;
      colorMapTextureRef.current = null;
    };
  }, [enabled, volume, createVolumeTexture, createColorMapTexture, renderMode, colorMap]);

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

  if (!enabled) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900 rounded-lg border border-gray-700">
        <p className="text-gray-300 text-sm">3D view disabled</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full rounded-lg overflow-hidden"
      style={{ minHeight: 300 }}
    />
  );
}
