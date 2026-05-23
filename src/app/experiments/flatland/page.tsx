'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

type Dimension = '1D' | '2D' | '3D';

interface ShapeDef {
  id: string;
  name: string;
  sides: number; // 0 = sphere
  color: string;
  socialClass: string;
  description: string;
  isosceles?: boolean;
}

const SHAPES: ShapeDef[] = [
  {
    id: 'woman',
    name: 'Woman',
    sides: 2,
    color: '#ff6b9d',
    socialClass: 'Lowest Class',
    description:
      'Women are straight line segments — indistinguishable from other lines. Their sharp endpoints are lethal weapons. By law they must constantly cry their location aloud or signal with their hind extremity to avoid impaling other Flatlanders.',
  },
  {
    id: 'soldier',
    name: 'Isosceles Soldier',
    sides: 3,
    isosceles: true,
    color: '#ff9f43',
    socialClass: 'Military / Working Class',
    description:
      'Soldiers are isosceles triangles with an extremely acute apex angle — sometimes less than 11°. The sharper the angle, the more dangerous and the lower the social class. They serve as army and police.',
  },
  {
    id: 'tradesman',
    name: 'Tradesman',
    sides: 3,
    color: '#ffd32a',
    socialClass: 'Middle Class',
    description:
      'Equilateral triangles are the artisan and merchant class. All three sides are equal — the first step toward the perfection of a circle and social equality.',
  },
  {
    id: 'square',
    name: 'A. Square',
    sides: 4,
    color: '#0be881',
    socialClass: 'Professional / Protagonist',
    description:
      'Squares are professional men — lawyers, doctors, merchants. The narrator of Flatland, A. Square, is visited by the Sphere from the third dimension and later imprisoned for spreading the "heresy" of higher dimensions.',
  },
  {
    id: 'pentagon',
    name: 'Pentagon',
    sides: 5,
    color: '#0fbcf9',
    socialClass: 'Gentleman / Lower Nobility',
    description:
      'Pentagons are gentlemen of leisure. In Flatland, nobility gains one additional side per generation through selective mating — evolution encoded in geometry.',
  },
  {
    id: 'hexagon',
    name: 'Hexagon',
    sides: 6,
    color: '#7d5fff',
    socialClass: 'Nobility',
    description:
      'Hexagons constitute the noble class, possessing special legal privileges and commanding great respect. Their sons may have one additional side, perpetuating the upward spiral of aristocracy.',
  },
  {
    id: 'priest',
    name: 'High Priest',
    sides: 12,
    color: '#e8e8f0',
    socialClass: 'Priestly / Ruling Class',
    description:
      "High Priests have many sides approaching the perfect circle. They form Flatland's ruling theocracy. A true Circle — infinitely many sides — represents the divine ideal and ultimate wisdom.",
  },
  {
    id: 'sphere',
    name: 'The Sphere',
    sides: 0,
    color: '#87ceeb',
    socialClass: '3D Visitor / Enlightener',
    description:
      "The Sphere passes through Flatland from the third dimension. As it intersects the 2D plane it appears as a circle that grows then shrinks — an impossible apparition that shatters A. Square's understanding of reality.",
  },
];

interface ShapeInst {
  id: number;
  defId: string;
  nx: number;
  ny: number;
  nz: number;
  vnx: number;
  vny: number;
  vnz: number;
  rotation: number;
  rotSpeed: number;
  size: number;
  spherePhase: number;
}

function initShapes(): ShapeInst[] {
  const counts: [string, number][] = [
    ['woman', 3],
    ['soldier', 2],
    ['tradesman', 2],
    ['square', 2],
    ['pentagon', 1],
    ['hexagon', 1],
    ['priest', 1],
    ['sphere', 1],
  ];
  let id = 0;
  return counts.flatMap(([defId, n]) =>
    Array.from({ length: n }, () => ({
      id: id++,
      defId,
      nx: 0.1 + Math.random() * 0.8,
      ny: 0.1 + Math.random() * 0.8,
      nz: 0.1 + Math.random() * 0.8,
      vnx: (Math.random() - 0.5) * 0.0018,
      vny: (Math.random() - 0.5) * 0.0018,
      vnz: (Math.random() - 0.5) * 0.0018,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.024,
      size: defId === 'woman' ? 0.046 : 0.022 + Math.random() * 0.016,
      spherePhase: Math.random() * Math.PI * 2,
    }))
  );
}

function polyVerts(def: ShapeDef, size: number, rot: number): [number, number][] {
  if (def.sides <= 2 || def.sides === 0) return [];
  if (def.isosceles) {
    const pts: [number, number][] = [
      [0, -size * 1.52],
      [-size * 0.22, size * 0.46],
      [size * 0.22, size * 0.46],
    ];
    return pts.map(([px, py]): [number, number] => [
      px * Math.cos(rot) - py * Math.sin(rot),
      px * Math.sin(rot) + py * Math.cos(rot),
    ]);
  }
  return Array.from({ length: def.sides }, (_, i): [number, number] => {
    const a = (i / def.sides) * Math.PI * 2 + rot - Math.PI / 2;
    return [Math.cos(a) * size, Math.sin(a) * size];
  });
}

function drawShape(
  ctx: CanvasRenderingContext2D,
  def: ShapeDef,
  inst: ShapeInst,
  cx: number,
  cy: number,
  scale: number
) {
  const sz = inst.size * scale;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.shadowColor = def.color;
  ctx.shadowBlur = 18;
  ctx.strokeStyle = def.color;
  ctx.fillStyle = `${def.color}28`;
  ctx.lineWidth = 2;

  if (def.sides === 0) {
    const r = Math.max(4, sz * (0.5 + 0.5 * Math.sin(inst.spherePhase)));
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    grad.addColorStop(0, `${def.color}88`);
    grad.addColorStop(1, `${def.color}10`);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.stroke();
  } else if (def.sides === 2) {
    ctx.save();
    ctx.rotate(inst.rotation);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-sz, 0);
    ctx.lineTo(sz, 0);
    ctx.stroke();
    ctx.shadowColor = '#ff2222';
    ctx.fillStyle = '#ff4444';
    [[-sz, 0], [sz, 0]].forEach(([ex, ey]) => {
      ctx.beginPath();
      ctx.arc(ex, ey, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  } else {
    const verts = polyVerts(def, sz, inst.rotation);
    ctx.beginPath();
    verts.forEach(([vx, vy], i) => {
      if (i === 0) ctx.moveTo(vx, vy);
      else ctx.lineTo(vx, vy);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function projExtent(
  def: ShapeDef,
  inst: ShapeInst,
  cx: number,
  scale: number
): [number, number] {
  const sz = inst.size * scale;
  if (def.sides === 0) {
    const r = sz * (0.5 + 0.5 * Math.sin(inst.spherePhase));
    return [cx - r, cx + r];
  }
  if (def.sides === 2) {
    const proj = sz * Math.abs(Math.cos(inst.rotation));
    return [cx - proj, cx + proj];
  }
  const verts = polyVerts(def, sz, inst.rotation);
  if (!verts.length) return [cx, cx];
  const xs = verts.map(([vx]) => cx + vx);
  return [Math.min(...xs), Math.max(...xs)];
}

function mkThreeGeo(def: ShapeDef, sz: number): THREE.BufferGeometry {
  if (def.sides === 0) return new THREE.SphereGeometry(sz, 32, 32);

  const shape = new THREE.Shape();
  if (def.sides === 2) {
    shape.moveTo(-sz, -2);
    shape.lineTo(sz, -2);
    shape.lineTo(sz, 2);
    shape.lineTo(-sz, 2);
    shape.closePath();
  } else if (def.isosceles) {
    shape.moveTo(0, -sz * 1.52);
    shape.lineTo(-sz * 0.22, sz * 0.46);
    shape.lineTo(sz * 0.22, sz * 0.46);
    shape.closePath();
  } else {
    for (let i = 0; i < def.sides; i++) {
      const a = (i / def.sides) * Math.PI * 2 - Math.PI / 2;
      if (i === 0) shape.moveTo(Math.cos(a) * sz, Math.sin(a) * sz);
      else shape.lineTo(Math.cos(a) * sz, Math.sin(a) * sz);
    }
    shape.closePath();
  }
  return new THREE.ExtrudeGeometry(shape, { depth: sz * 0.4, bevelEnabled: false });
}

function ShapeCard({
  def,
  active,
  onClick,
}: {
  def: ShapeDef;
  active: boolean;
  onClick: () => void;
}) {
  const C = 25,
    R = 19;
  let inner: React.ReactNode;

  if (def.sides === 0) {
    inner = (
      <circle cx={C} cy={C} r={R} fill={`${def.color}35`} stroke={def.color} strokeWidth="2" />
    );
  } else if (def.sides === 2) {
    inner = (
      <line
        x1="4"
        y1={C}
        x2="46"
        y2={C}
        stroke={def.color}
        strokeWidth="3"
        strokeLinecap="round"
      />
    );
  } else {
    const n = Math.min(def.sides, 12);
    const pts: [number, number][] = def.isosceles
      ? [
          [C, 6],
          [C - 6, 43],
          [C + 6, 43],
        ]
      : Array.from({ length: n }, (_, i): [number, number] => {
          const a = (i / n) * Math.PI * 2 - Math.PI / 2;
          return [C + Math.cos(a) * R, C + Math.sin(a) * R];
        });
    inner = (
      <polygon
        points={pts.map(([x, y]) => `${x},${y}`).join(' ')}
        fill={`${def.color}35`}
        stroke={def.color}
        strokeWidth="2"
      />
    );
  }

  return (
    <button
      onClick={onClick}
      className="w-full text-left flex gap-3 items-start p-2 rounded-lg transition-all duration-200 cursor-pointer"
      style={{
        background: active ? `${def.color}12` : 'transparent',
        borderLeft: `3px solid ${active ? def.color : 'transparent'}`,
      }}
    >
      <svg width="50" height="50" viewBox="0 0 50 50" className="flex-shrink-0 mt-0.5">
        {inner}
      </svg>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold leading-tight" style={{ color: def.color }}>
          {def.name}
        </div>
        <div className="text-xs text-gray-500 leading-tight mb-1">{def.socialClass}</div>
        {active && (
          <div className="text-xs text-gray-300 leading-relaxed">{def.description}</div>
        )}
      </div>
    </button>
  );
}

export default function FlatlandPage() {
  const [dimension, setDimension] = useState<Dimension>('2D');
  const [activeShapeId, setActiveShapeId] = useState<string | null>(null);
  const [showGlossary, setShowGlossary] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const threeContainerRef = useRef<HTMLDivElement>(null);
  const instRef = useRef<ShapeInst[]>([]);
  const dimRef = useRef<Dimension>('2D');
  const frameRef = useRef<number>(0);
  const camRef = useRef({
    theta: 0.4,
    phi: Math.PI / 3.5,
    isDragging: false,
    lastMx: 0,
    lastMy: 0,
    autoRotate: true,
  });

  useEffect(() => {
    instRef.current = initShapes();
  }, []);

  useEffect(() => {
    dimRef.current = dimension;

    if (dimension !== '3D') {
      return startCanvas();
    }

    let cleanup: (() => void) | undefined;
    const rafId = requestAnimationFrame(() => {
      cleanup = startThreeJS();
    });
    return () => {
      cancelAnimationFrame(rafId);
      cleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dimension]);

  function stepShapes(use3D: boolean) {
    for (const inst of instRef.current) {
      const def = SHAPES.find((d) => d.id === inst.defId)!;
      inst.nx += inst.vnx;
      inst.ny += inst.vny;
      if (use3D) inst.nz += inst.vnz;
      inst.rotation += inst.rotSpeed;
      if (def.sides === 0) inst.spherePhase += 0.018;

      if (inst.nx < 0.05 || inst.nx > 0.95) {
        inst.vnx *= -1;
        inst.nx = Math.max(0.05, Math.min(0.95, inst.nx));
      }
      if (inst.ny < 0.05 || inst.ny > 0.95) {
        inst.vny *= -1;
        inst.ny = Math.max(0.05, Math.min(0.95, inst.ny));
      }
      if (use3D && (inst.nz < 0.05 || inst.nz > 0.95)) {
        inst.vnz *= -1;
        inst.nz = Math.max(0.05, Math.min(0.95, inst.nz));
      }
    }
  }

  function startCanvas(): () => void {
    const canvas = canvasRef.current;
    if (!canvas) return () => {};
    const container = canvas.parentElement;
    if (!container) return () => {};

    const resize = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const tick = () => {
      frameRef.current = requestAnimationFrame(tick);
      const W = canvas.width;
      const H = canvas.height;
      if (W === 0 || H === 0) return;

      stepShapes(false);

      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#050508';
      ctx.fillRect(0, 0, W, H);

      if (dimRef.current === '1D') {
        renderLineland(ctx, W, H);
      } else {
        renderFlatland(ctx, W, H);
      }
    };
    tick();

    return () => {
      cancelAnimationFrame(frameRef.current);
      ro.disconnect();
    };
  }

  function renderLineland(ctx: CanvasRenderingContext2D, W: number, H: number) {
    const lineY = H / 2;
    const margin = 75;
    const lineW = W - 2 * margin;

    ctx.fillStyle = '#06060e';
    ctx.fillRect(0, 0, W, H);

    // Axis label
    ctx.save();
    ctx.font = '11px monospace';
    ctx.fillStyle = '#14142a';
    ctx.textAlign = 'center';
    ctx.fillText('L I N E L A N D', W / 2, lineY - 48);
    ctx.restore();

    // The one line
    ctx.save();
    const lineGrad = ctx.createLinearGradient(margin, 0, W - margin, 0);
    lineGrad.addColorStop(0, 'transparent');
    lineGrad.addColorStop(0.04, '#16163a');
    lineGrad.addColorStop(0.96, '#16163a');
    lineGrad.addColorStop(1, 'transparent');
    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin, lineY);
    ctx.lineTo(W - margin, lineY);
    ctx.stroke();
    ctx.restore();

    // Project each shape
    for (const inst of instRef.current) {
      const def = SHAPES.find((d) => d.id === inst.defId)!;
      const cx = margin + inst.nx * lineW;
      const scale = lineW * 0.22;
      const [mn, mx] = projExtent(def, inst, cx, scale);
      const len = Math.max(3, mx - mn);

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineWidth = 10;
      ctx.strokeStyle = def.color;
      ctx.shadowColor = def.color;
      ctx.shadowBlur = 20;
      ctx.globalAlpha = 0.88;
      ctx.beginPath();
      ctx.moveTo(mn, lineY);
      ctx.lineTo(mn + len, lineY);
      ctx.stroke();
      ctx.restore();
    }

    // Annotations
    ctx.save();
    ctx.font = '11px monospace';
    ctx.fillStyle = '#1a1a38';
    ctx.textAlign = 'left';
    [
      'In Lineland, existence is a single line.',
      'Each shape projects onto this line — you see only its width.',
      'A triangle and a square are indistinguishable here.',
    ].forEach((line, i) => {
      ctx.fillText(line, margin, lineY + 40 + i * 18);
    });
    ctx.restore();
  }

  function renderFlatland(ctx: CanvasRenderingContext2D, W: number, H: number) {
    const scale = Math.min(W, H);

    // Subtle grid
    ctx.save();
    ctx.strokeStyle = '#0d0d1a';
    ctx.lineWidth = 1;
    const gs = 55;
    for (let x = 0; x < W; x += gs) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += gs) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.restore();

    for (const inst of instRef.current) {
      const def = SHAPES.find((d) => d.id === inst.defId)!;
      drawShape(ctx, def, inst, inst.nx * W, inst.ny * H, scale);
    }
  }

  function startThreeJS(): () => void {
    const container = threeContainerRef.current;
    if (!container) return () => {};

    const W = container.clientWidth || window.innerWidth;
    const H = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x141428);
    scene.fog = new THREE.FogExp2(0x141428, 0.0012);

    const camera = new THREE.PerspectiveCamera(55, W / H, 1, 3000);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xaaaacc, 5));
    const key = new THREE.DirectionalLight(0xffffff, 4);
    key.position.set(200, 300, 150);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xbbbbff, 1.5);
    fill.position.set(-200, -100, -200);
    scene.add(fill);

    const grid = new THREE.GridHelper(620, 16, 0x2a2a50, 0x1e1e3c);
    grid.position.y = -160;
    scene.add(grid);

    const WORLD = 260;
    const meshes = new Map<number, THREE.Mesh>();

    for (const inst of instRef.current) {
      const def = SHAPES.find((d) => d.id === inst.defId)!;
      const sz = inst.size * WORLD;
      const geo = mkThreeGeo(def, sz);
      const col = new THREE.Color(def.color);
      const mat = new THREE.MeshPhongMaterial({
        color: col,
        emissive: col.clone().multiplyScalar(0.35),
        transparent: false,
        opacity: 1,
        shininess: 90,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        (inst.nx - 0.5) * WORLD * 2.2,
        (inst.ny - 0.5) * WORLD,
        (inst.nz - 0.5) * WORLD * 2.2
      );
      scene.add(mesh);
      meshes.set(inst.id, mesh);

      const edges = new THREE.EdgesGeometry(geo);
      const edgeMat = new THREE.LineBasicMaterial({
        color: def.color,
        opacity: 0.7,
        transparent: true,
      });
      mesh.add(new THREE.LineSegments(edges, edgeMat));
    }

    const cam = camRef.current;
    const R = 750;

    const onDown = (e: MouseEvent) => {
      cam.isDragging = true;
      cam.autoRotate = false;
      cam.lastMx = e.clientX;
      cam.lastMy = e.clientY;
    };
    const onMove = (e: MouseEvent) => {
      if (!cam.isDragging) return;
      cam.theta -= (e.clientX - cam.lastMx) * 0.008;
      cam.phi = Math.max(
        0.15,
        Math.min(Math.PI * 0.45, cam.phi + (e.clientY - cam.lastMy) * 0.008)
      );
      cam.lastMx = e.clientX;
      cam.lastMy = e.clientY;
    };
    const onUp = () => {
      cam.isDragging = false;
    };
    const onTouch = (e: TouchEvent) => {
      cam.isDragging = true;
      cam.autoRotate = false;
      cam.lastMx = e.touches[0].clientX;
      cam.lastMy = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!cam.isDragging) return;
      cam.theta -= (e.touches[0].clientX - cam.lastMx) * 0.008;
      cam.phi = Math.max(
        0.15,
        Math.min(Math.PI * 0.45, cam.phi + (e.touches[0].clientY - cam.lastMy) * 0.008)
      );
      cam.lastMx = e.touches[0].clientX;
      cam.lastMy = e.touches[0].clientY;
    };

    renderer.domElement.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    renderer.domElement.addEventListener('touchstart', onTouch);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onUp);

    const onResize = () => {
      const nW = container.clientWidth;
      const nH = container.clientHeight;
      camera.aspect = nW / nH;
      camera.updateProjectionMatrix();
      renderer.setSize(nW, nH);
    };
    window.addEventListener('resize', onResize);

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);

      if (cam.autoRotate) cam.theta += 0.003;

      camera.position.x = R * Math.sin(cam.phi) * Math.cos(cam.theta);
      camera.position.y = R * Math.cos(cam.phi);
      camera.position.z = R * Math.sin(cam.phi) * Math.sin(cam.theta);
      camera.lookAt(0, 0, 0);

      stepShapes(true);

      for (const inst of instRef.current) {
        const def = SHAPES.find((d) => d.id === inst.defId)!;
        const mesh = meshes.get(inst.id);
        if (!mesh) continue;
        mesh.position.set(
          (inst.nx - 0.5) * WORLD * 2.2,
          (inst.ny - 0.5) * WORLD,
          (inst.nz - 0.5) * WORLD * 2.2
        );
        mesh.rotation.y += inst.rotSpeed * 0.5;
        if (def.sides === 0) {
          const s = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(inst.spherePhase));
          mesh.scale.setScalar(s);
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameRef.current);
      renderer.domElement.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      renderer.domElement.removeEventListener('touchstart', onTouch);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onUp);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }

  const DIMS: { id: Dimension; label: string; sub: string }[] = [
    { id: '1D', label: '1D', sub: 'Lineland' },
    { id: '2D', label: '2D', sub: 'Flatland' },
    { id: '3D', label: '3D', sub: 'Spaceland' },
  ];

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#050508]">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 px-5 py-4 flex items-start justify-between pointer-events-none">
        <div>
          <h1 className="text-xl font-light tracking-[0.25em] text-gray-200">FLATLAND</h1>
          <p className="text-[11px] text-gray-600 tracking-widest mt-0.5">
            A Romance of Many Dimensions · Edwin Abbott Abbott, 1884
          </p>
        </div>
        <button
          className="pointer-events-auto text-[11px] tracking-widest text-gray-600 hover:text-gray-300 transition-colors mt-1"
          onClick={() => setShowGlossary((g) => !g)}
        >
          {showGlossary ? 'HIDE' : 'SHOW'} GLOSSARY
        </button>
      </div>

      {/* Canvas area */}
      <div
        className="absolute inset-0 transition-all duration-300"
        style={{ right: showGlossary ? 280 : 0 }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ display: dimension !== '3D' ? 'block' : 'none' }}
        />
        <div
          ref={threeContainerRef}
          className="absolute inset-0 w-full h-full"
          style={{ display: dimension === '3D' ? 'block' : 'none' }}
        />

        {/* Contextual hint */}
        <div className="absolute top-14 left-5 text-[11px] text-gray-800 pointer-events-none select-none">
          {dimension === '3D' && 'Drag to rotate · shapes extruded into the third dimension'}
          {dimension === '1D' && 'All shapes collapse to line segments · form is imperceptible'}
          {dimension === '2D' && "God's eye view · Flatlanders themselves perceive only edges"}
        </div>
      </div>

      {/* Dimension controls */}
      <div
        className="absolute bottom-6 z-20 flex gap-2"
        style={{
          left: showGlossary ? 'calc(50% - 140px)' : '50%',
          transform: showGlossary ? 'none' : 'translateX(-50%)',
        }}
      >
        {DIMS.map(({ id, label, sub }) => {
          const active = dimension === id;
          return (
            <button
              key={id}
              onClick={() => setDimension(id)}
              className="px-7 py-3 rounded-xl border text-center transition-all duration-300 font-mono"
              style={{
                borderColor: active ? '#6688ff' : '#2a2a44',
                background: active ? '#1a2550' : '#12121e',
                color: active ? '#99aaff' : '#5566aa',
                boxShadow: active
                  ? '0 0 24px #6688ff55, inset 0 0 20px #6688ff14'
                  : 'none',
              }}
            >
              <div className="text-lg font-bold leading-none">{label}</div>
              <div className="text-[9px] tracking-widest mt-1 opacity-60">{sub}</div>
            </button>
          );
        })}
      </div>

      {/* Glossary sidebar */}
      {showGlossary && (
        <div
          className="absolute top-0 right-0 bottom-0 w-[280px] z-10 overflow-y-auto border-l"
          style={{
            background: 'linear-gradient(to right, #06060e, #060610)',
            borderColor: '#0e0e20',
          }}
        >
          <div className="pt-16 pb-24 px-2">
            <div className="text-[9px] tracking-[0.35em] text-gray-700 mb-3 px-2 font-mono">
              CHARACTERS
            </div>
            <div className="space-y-0.5">
              {SHAPES.map((def) => (
                <ShapeCard
                  key={def.id}
                  def={def}
                  active={activeShapeId === def.id}
                  onClick={() =>
                    setActiveShapeId((prev) => (prev === def.id ? null : def.id))
                  }
                />
              ))}
            </div>
            <div className="px-2 mt-6 pt-4 border-t border-gray-800/40">
              <p className="text-[10px] text-gray-700 leading-relaxed font-mono italic">
                &ldquo;Upward, not Northward&rdquo; — the Sphere&apos;s invitation to A. Square to
                perceive the third dimension.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
