// Crochet rendering utilities

import {
  Stitch,
  StitchInstruction,
  StitchType,
  drawStitch,
} from './crochet-stitches';
import { CrochetPattern } from './crochet-patterns';

// Build all stitches from a pattern
export function buildStitchesFromPattern(
  pattern: CrochetPattern,
  canvasWidth: number,
  canvasHeight: number,
  mode: 'chart' | 'realistic' = 'chart'
): Stitch[] {
  const stitches: Stitch[] = [];
  const stitchId = 0;

  if (pattern.workInRound) {
    // In-the-round layout (circular/spiral from center)
    buildInTheRound(pattern, stitches, canvasWidth, canvasHeight, stitchId, mode);
  } else {
    // Flat work layout (rows from bottom to top)
    buildFlatWork(pattern, stitches, canvasWidth, canvasHeight, stitchId, mode);
  }

  return stitches;
}

// Build flat work (rows) - CrochetPARADE-inspired node-based approach
function buildFlatWork(
  pattern: CrochetPattern,
  stitches: Stitch[],
  canvasWidth: number,
  canvasHeight: number,
  startId: number,
  mode: 'chart' | 'realistic'
) {
  let stitchId = startId;
  const paddingY = 60;
  const stitchSpacing = 20; // Horizontal spacing between stitch nodes
  const chartRowHeight = 35; // Vertical spacing between rows (chart mode)

  let currentY = canvasHeight - paddingY;

  pattern.rows.forEach((row, rowIndex) => {
    // Count total stitches in row
    let totalStitches = 0;
    row.forEach(instruction => {
      totalStitches += instruction.count;
    });

    // Calculate total width and center the row
    const totalWidth = totalStitches * stitchSpacing;
    const leftX = (canvasWidth - totalWidth) / 2;

    // Flat crochet is worked back and forth, so in realistic mode odd rows
    // run right-to-left like real turned rows
    const reverse = mode === 'realistic' && rowIndex % 2 === 1;

    // Create stitches for this row (nodes in the mesh)
    let stitchInRow = 0;
    row.forEach(instruction => {
      const color = instruction.color || pattern.defaultColor;

      for (let i = 0; i < instruction.count; i++) {
        const slot = reverse ? totalStitches - 1 - stitchInRow : stitchInRow;
        stitches.push({
          id: `stitch-${stitchId++}`,
          type: instruction.type,
          x: leftX + slot * stitchSpacing,
          y: currentY,
          color,
          rowIndex,
          stitchIndex: stitchInRow,
          animationProgress: 0,
        });

        stitchInRow++;
      }
    });

    // Move up for next row. In realistic mode the gap is the height of the
    // stitches in the next row, so its legs reach down into this row's heads
    if (mode === 'realistic') {
      const nextRow = pattern.rows[rowIndex + 1];
      currentY -= nextRow
        ? Math.max(...nextRow.map(inst => FABRIC_ROW_HEIGHT[inst.type] || 14))
        : 0;
    } else {
      currentY -= chartRowHeight;
    }
  });
}

// Build in-the-round (circular)
function buildInTheRound(
  pattern: CrochetPattern,
  stitches: Stitch[],
  canvasWidth: number,
  canvasHeight: number,
  startId: number,
  mode: 'chart' | 'realistic'
) {
  let stitchId = startId;
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  let currentRadius = 0;
  // Tighter rounds in realistic mode so each round's legs reach the round below
  const radiusIncrement = mode === 'realistic' ? 14 : 25;

  pattern.rows.forEach((row, rowIndex) => {
    // Count total stitches in this row
    let totalStitchesInRow = 0;
    row.forEach(instruction => {
      totalStitchesInRow += instruction.count;
    });

    // Special handling for first row (magic ring)
    if (rowIndex === 0 && row[0]?.type === StitchType.MAGIC_RING) {
      // Place magic ring at center
      stitches.push({
        id: `stitch-${stitchId++}`,
        type: StitchType.MAGIC_RING,
        x: centerX,
        y: centerY,
        color: pattern.defaultColor,
        rowIndex,
        stitchIndex: 0,
        animationProgress: 0,
      });

      // Place subsequent stitches in ring around center
      if (row.length > 1) {
        const ringRadius = mode === 'realistic' ? 12 : 15;
        const stitchesToPlace = row.slice(1);
        let stitchesPlaced = 0;

        stitchesToPlace.forEach(instruction => {
          const color = instruction.color || pattern.defaultColor;

          for (let i = 0; i < instruction.count; i++) {
            const angle = (stitchesPlaced / (totalStitchesInRow - 1)) * Math.PI * 2;
            stitches.push({
              id: `stitch-${stitchId++}`,
              type: instruction.type,
              x: centerX + Math.cos(angle) * ringRadius,
              y: centerY + Math.sin(angle) * ringRadius,
              color,
              rowIndex,
              stitchIndex: stitchesPlaced,
              animationProgress: 0,
            });
            stitchesPlaced++;
          }
        });
      }

      currentRadius = mode === 'realistic' ? 12 + radiusIncrement : radiusIncrement;
    } else {
      // Regular round - place stitches in circle
      let stitchesPlaced = 0;

      row.forEach(instruction => {
        const color = instruction.color || pattern.defaultColor;

        for (let i = 0; i < instruction.count; i++) {
          const angle = (stitchesPlaced / totalStitchesInRow) * Math.PI * 2 - Math.PI / 2;
          stitches.push({
            id: `stitch-${stitchId++}`,
            type: instruction.type,
            x: centerX + Math.cos(angle) * currentRadius,
            y: centerY + Math.sin(angle) * currentRadius,
            color,
            rowIndex,
            stitchIndex: stitchesPlaced,
            animationProgress: 0,
          });
          stitchesPlaced++;
        }
      });

      currentRadius += radiusIncrement;
    }
  });
}

// Render all stitches to canvas
export function renderStitches(
  ctx: CanvasRenderingContext2D,
  stitches: Stitch[],
  currentStitchIndex: number,
  renderMode: 'chart' | 'realistic' = 'chart'
) {
  // Clear canvas
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Draw background
  if (renderMode === 'realistic') {
    // Realistic surface background
    const gradient = ctx.createRadialGradient(
      ctx.canvas.width / 2,
      ctx.canvas.height / 2,
      0,
      ctx.canvas.width / 2,
      ctx.canvas.height / 2,
      Math.max(ctx.canvas.width, ctx.canvas.height) / 2
    );
    gradient.addColorStop(0, '#FAFAFA');
    gradient.addColorStop(0.7, '#F0F0F0');
    gradient.addColorStop(1, '#E0E0E0');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Add subtle texture
    ctx.globalAlpha = 0.03;
    for (let i = 0; i < 2000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#000' : '#fff';
      ctx.fillRect(
        Math.random() * ctx.canvas.width,
        Math.random() * ctx.canvas.height,
        1,
        1
      );
    }
    ctx.globalAlpha = 1;
  } else {
    ctx.fillStyle = '#FAFAFA';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  // Draw all stitches up to and including current
  if (renderMode === 'realistic') {
    // Draw interlocked yarn fabric
    drawFabric(ctx, stitches, currentStitchIndex);
  } else {
    // Chart mode - just draw stitches
    for (let i = 0; i <= currentStitchIndex && i < stitches.length; i++) {
      drawStitch(ctx, stitches[i]);
    }
  }
}

// ============ Interlocked fabric rendering (realistic mode) ============

const YARN_THICKNESS = 8.5;
const HEAD_W = 11; // Half-width of a stitch head (the "V" the next row works into)
const HEAD_H = 7; // Height of the head arc

// Vertical space a row of each stitch type occupies in the fabric
const FABRIC_ROW_HEIGHT: Record<StitchType, number> = {
  [StitchType.CHAIN]: 12,
  [StitchType.SINGLE_CROCHET]: 14,
  [StitchType.SLIP_STITCH]: 10,
  [StitchType.DOUBLE_CROCHET]: 24,
  [StitchType.HALF_DOUBLE]: 18,
  [StitchType.TREBLE]: 30,
  [StitchType.MAGIC_RING]: 14,
  [StitchType.INCREASE]: 14,
  [StitchType.DECREASE]: 14,
};

// Number of yarn-over wraps shown on the post of tall stitches
const POST_WRAPS: Partial<Record<StitchType, number>> = {
  [StitchType.DOUBLE_CROCHET]: 1,
  [StitchType.TREBLE]: 2,
};

interface YarnPoint {
  x: number;
  y: number;
  depth: number; // -1 (behind fabric) to 1 (front)
}

interface Vec {
  x: number;
  y: number;
}

function unitVec(from: Vec, to: Vec): Vec {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return { x: dx / len, y: dy / len };
}

// Arc over the top of a stitch head; t sweeps 0 (left end) to 1 (right end).
// u points "down" toward the stitch worked into, p is perpendicular (along the row)
function headPoints(
  cx: number,
  cy: number,
  u: Vec,
  p: Vec,
  hw: number,
  hh: number,
  t0: number,
  t1: number,
  steps: number
): YarnPoint[] {
  const pts: YarnPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = t0 + (t1 - t0) * (i / steps);
    const a = Math.PI * (1 - t);
    pts.push({
      x: cx + p.x * hw * Math.cos(a) - u.x * hh * Math.sin(a),
      y: cy + p.y * hw * Math.cos(a) - u.y * hh * Math.sin(a),
      depth: 0.2 + 0.5 * Math.sin(a),
    });
  }
  return pts;
}

// Full closed loop (chains, slip stitches, magic ring)
function ovalPoints(
  cx: number,
  cy: number,
  u: Vec,
  p: Vec,
  rx: number,
  ry: number
): YarnPoint[] {
  const steps = 20;
  const pts: YarnPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    pts.push({
      x: cx + p.x * rx * Math.cos(a) - u.x * ry * Math.sin(a),
      y: cy + p.y * rx * Math.cos(a) - u.y * ry * Math.sin(a),
      depth: 0.2 + 0.3 * Math.sin(a),
    });
  }
  return pts;
}

// Quadratic-bezier leg that dives down behind the base stitch's head
function legPoints(from: Vec, to: Vec, bow: Vec): YarnPoint[] {
  const steps = 6;
  const cx = (from.x + to.x) / 2 + bow.x;
  const cy = (from.y + to.y) / 2 + bow.y;
  const pts: YarnPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    pts.push({
      x: mt * mt * from.x + 2 * mt * t * cx + t * t * to.x,
      y: mt * mt * from.y + 2 * mt * t * cy + t * t * to.y,
      depth: 0.2 - t, // sinks behind the base as it descends
    });
  }
  return pts;
}

function drawYarnPath(
  ctx: CanvasRenderingContext2D,
  pts: YarnPoint[],
  color: string,
  fraction: number = 1
) {
  const n = Math.round((pts.length - 1) * Math.max(0, Math.min(1, fraction)));
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const depth = (a.depth + b.depth) / 2;
    drawYarnSegment(
      ctx,
      a.x,
      a.y,
      b.x,
      b.y,
      color,
      YARN_THICKNESS * (1 + depth * 0.12),
      depth
    );
  }
}

// Draw the whole piece as interlocked stitches, oldest first so newer rows
// layer over the heads they are worked into
function drawFabric(
  ctx: CanvasRenderingContext2D,
  stitches: Stitch[],
  currentStitchIndex: number
) {
  if (currentStitchIndex < 0 || stitches.length === 0) return;

  const last = Math.min(currentStitchIndex, stitches.length - 1);
  for (let i = 0; i <= last; i++) {
    drawFabricStitch(ctx, stitches, stitches[i]);
  }
}

function drawFabricStitch(
  ctx: CanvasRenderingContext2D,
  stitches: Stitch[],
  stitch: Stitch
) {
  const progress = stitch.animationProgress;
  if (progress <= 0.02) return;

  const { color, type } = stitch;
  const base = findBaseStitch(stitches, stitch);
  // "Down" direction points at the stitch this one is worked into, so the
  // same geometry works for flat rows and in-the-round
  const u = base ? unitVec(stitch, base) : { x: 0, y: 1 };
  const p = { x: -u.y, y: u.x };

  if (type === StitchType.MAGIC_RING) {
    drawYarnPath(ctx, ovalPoints(stitch.x, stitch.y, u, p, 9, 9), color, progress);
    if (progress > 0.6) {
      ctx.save();
      ctx.fillStyle = color;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 3;
      ctx.beginPath();
      ctx.arc(stitch.x, stitch.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    return;
  }

  // Chains and slip stitches are plain loops; anything with no stitch to
  // work into also falls back to a loop
  if (!base || type === StitchType.CHAIN || type === StitchType.SLIP_STITCH) {
    const rx = type === StitchType.SLIP_STITCH ? 6 : HEAD_W - 1;
    const ry = type === StitchType.SLIP_STITCH ? 4 : HEAD_H;
    drawYarnPath(ctx, ovalPoints(stitch.x, stitch.y, u, p, rx, ry), color, progress);
    return;
  }

  if (type === StitchType.INCREASE) {
    // Two stitches worked into the same base stitch
    drawWorkedStitch(ctx, stitches, stitch, base, u, p, -5, HEAD_W * 0.65, 0, 3.5, Math.min(progress * 2, 1));
    drawWorkedStitch(ctx, stitches, stitch, base, u, p, 5, HEAD_W * 0.65, 0, 3.5, Math.max(0, (progress - 0.5) * 2));
    return;
  }

  const wraps = POST_WRAPS[type] ?? 0;
  // Decreases pull two base stitches together, so their legs spread wide
  const baseSpread = type === StitchType.DECREASE ? 10 : 3.5;
  const hw = type === StitchType.DECREASE ? HEAD_W * 1.15 : HEAD_W;
  drawWorkedStitch(ctx, stitches, stitch, base, u, p, 0, hw, wraps, baseSpread, progress);
}

// Draw a stitch that is worked into a base stitch: two legs descend and pass
// behind the base's head, then the head's front strand is re-drawn on top so
// the rows visibly interlock, and finally this stitch's own head is added
function drawWorkedStitch(
  ctx: CanvasRenderingContext2D,
  stitches: Stitch[],
  stitch: Stitch,
  base: Stitch,
  u: Vec,
  p: Vec,
  offset: number,
  hw: number,
  wraps: number,
  baseSpread: number,
  progress: number
) {
  if (progress <= 0.02) return;

  const cx = stitch.x + p.x * offset;
  const cy = stitch.y + p.y * offset;
  const color = stitch.color;

  const legProgress = Math.min(progress / 0.55, 1);
  const headProgress = Math.max(0, (progress - 0.55) / 0.45);

  // Legs run from just under the head ends down to converge behind the base
  const legTopL = { x: cx - p.x * hw * 0.75, y: cy - p.y * hw * 0.75 };
  const legTopR = { x: cx + p.x * hw * 0.75, y: cy + p.y * hw * 0.75 };
  const legBotL = { x: base.x - p.x * baseSpread, y: base.y - p.y * baseSpread };
  const legBotR = { x: base.x + p.x * baseSpread, y: base.y + p.y * baseSpread };
  drawYarnPath(ctx, legPoints(legTopL, legBotL, { x: -p.x * 2.5, y: -p.y * 2.5 }), color, legProgress);
  drawYarnPath(ctx, legPoints(legTopR, legBotR, { x: p.x * 2.5, y: p.y * 2.5 }), color, legProgress);

  if (legProgress >= 1) {
    // Yarn-over wraps across the post of tall stitches (dc, treble)
    for (let w = 0; w < wraps; w++) {
      const t = 0.4 + w * 0.22;
      const wx = cx + (base.x - cx) * t;
      const wy = cy + (base.y - cy) * t;
      const ww = hw * 0.85;
      drawYarnPath(ctx, [
        { x: wx - p.x * ww + u.x * 2, y: wy - p.y * ww + u.y * 2, depth: 0.5 },
        { x: wx + p.x * ww - u.x * 2, y: wy + p.y * ww - u.y * 2, depth: 0.7 },
      ], color);
    }

    // Re-draw the top of the base stitch's head over the legs — this is what
    // makes the new stitch look pulled through the loop below
    const baseBase = findBaseStitch(stitches, base);
    const bu = baseBase ? unitVec(base, baseBase) : { x: 0, y: 1 };
    const bp = { x: -bu.y, y: bu.x };
    drawYarnPath(
      ctx,
      headPoints(base.x, base.y, bu, bp, HEAD_W - 1, HEAD_H, 0.28, 0.72, 6),
      base.color
    );
  }

  // This stitch's own head — the "V" the next row will work into
  if (headProgress > 0) {
    drawYarnPath(ctx, headPoints(cx, cy, u, p, hw, HEAD_H, 0, 1, 10), color, headProgress);
  }
}

// Draw a segment of yarn with 3D appearance
function drawYarnSegment(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  thickness: number,
  depth: number // -1 (back) to 1 (front)
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const angle = Math.atan2(dy, dx);

  ctx.save();

  // Shadow for depth
  const shadowAlpha = 0.15 + depth * 0.1;
  ctx.strokeStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
  ctx.lineWidth = thickness + 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1 + 1.5, y1 + 2);
  ctx.lineTo(x2 + 1.5, y2 + 2);
  ctx.stroke();

  // Create cylindrical gradient
  const gradient = ctx.createLinearGradient(
    x1 - Math.sin(angle) * thickness / 2,
    y1 + Math.cos(angle) * thickness / 2,
    x1 + Math.sin(angle) * thickness / 2,
    y1 - Math.cos(angle) * thickness / 2
  );

  const parseColor = (col: string) => {
    if (col.startsWith('#')) {
      const hex = col.replace('#', '');
      return {
        r: parseInt(hex.substr(0, 2), 16) || 128,
        g: parseInt(hex.substr(2, 2), 16) || 128,
        b: parseInt(hex.substr(4, 2), 16) || 128,
      };
    }
    return { r: 128, g: 128, b: 128 };
  };

  const { r, g, b } = parseColor(color);

  // Adjust brightness based on depth
  const depthBrightness = depth * 15;

  gradient.addColorStop(0, `rgb(${Math.max(0, r - 40 + depthBrightness)}, ${Math.max(0, g - 40 + depthBrightness)}, ${Math.max(0, b - 40 + depthBrightness)})`);
  gradient.addColorStop(0.3, `rgb(${Math.max(0, r - 15 + depthBrightness)}, ${Math.max(0, g - 15 + depthBrightness)}, ${Math.max(0, b - 15 + depthBrightness)})`);
  gradient.addColorStop(0.5, `rgb(${Math.min(255, r + depthBrightness)}, ${Math.min(255, g + depthBrightness)}, ${Math.min(255, b + depthBrightness)})`);
  gradient.addColorStop(0.7, `rgb(${Math.min(255, r + 25 + depthBrightness)}, ${Math.min(255, g + 25 + depthBrightness)}, ${Math.min(255, b + 25 + depthBrightness)})`);
  gradient.addColorStop(1, `rgb(${Math.max(0, r - 40 + depthBrightness)}, ${Math.max(0, g - 40 + depthBrightness)}, ${Math.max(0, b - 40 + depthBrightness)})`);

  ctx.strokeStyle = gradient;
  ctx.lineWidth = thickness;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Add yarn texture
  ctx.fillStyle = `rgba(255, 255, 255, ${0.12 + depth * 0.05})`;
  const length = Math.sqrt(dx * dx + dy * dy);
  const segments = Math.max(2, Math.floor(length / 10));
  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    const x = x1 + dx * t;
    const y = y1 + dy * t;
    ctx.beginPath();
    ctx.arc(
      x - Math.sin(angle) * thickness * 0.2,
      y + Math.cos(angle) * thickness * 0.2,
      thickness * 0.12,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  // Highlight on top edge
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.35 + depth * 0.1})`;
  ctx.lineWidth = thickness * 0.3;
  ctx.beginPath();
  ctx.moveTo(
    x1 - Math.sin(angle) * thickness * 0.25,
    y1 + Math.cos(angle) * thickness * 0.25
  );
  ctx.lineTo(
    x2 - Math.sin(angle) * thickness * 0.25,
    y2 + Math.cos(angle) * thickness * 0.25
  );
  ctx.stroke();

  ctx.restore();
}

// Find the stitch this one is worked into (nearest stitch of the previous row)
function findBaseStitch(stitches: Stitch[], currentStitch: Stitch): Stitch | null {
  if (currentStitch.type === StitchType.MAGIC_RING) return null;

  let candidates = stitches.filter(s => s.rowIndex === currentStitch.rowIndex - 1);
  if (candidates.length === 0) {
    // The first round of amigurumi is worked into the magic ring in the same row
    candidates = stitches.filter(
      s => s.rowIndex === currentStitch.rowIndex && s.type === StitchType.MAGIC_RING
    );
  }

  let closest: Stitch | null = null;
  let minDist = Infinity;
  for (const s of candidates) {
    const d = (s.x - currentStitch.x) ** 2 + (s.y - currentStitch.y) ** 2;
    if (d < minDist) {
      minDist = d;
      closest = s;
    }
  }

  // Too far away to plausibly be worked into (e.g. detached parts of a piece)
  if (closest && minDist > 60 * 60) return null;

  return closest;
}

// Draw worked-into connection (vertical connection to stitch below)
function _drawWorkedIntoConnection(
  ctx: CanvasRenderingContext2D,
  baseStitch: Stitch,
  workingStitch: Stitch
) {
  // Draw a thick yarn connection showing the working stitch is worked into the base stitch
  const thickness = 10;
  const dx = workingStitch.x - baseStitch.x;
  const dy = workingStitch.y - baseStitch.y;
  const angle = Math.atan2(dy, dx);

  ctx.save();

  // Slightly transparent to show layering
  ctx.globalAlpha = workingStitch.animationProgress * 0.9;

  // Shadow for depth
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.lineWidth = thickness + 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(baseStitch.x + 1, baseStitch.y + 1.5);
  ctx.lineTo(workingStitch.x + 1, workingStitch.y + 1.5);
  ctx.stroke();

  // Main yarn strand
  const gradient = ctx.createLinearGradient(
    baseStitch.x - Math.sin(angle) * thickness / 2,
    baseStitch.y + Math.cos(angle) * thickness / 2,
    baseStitch.x + Math.sin(angle) * thickness / 2,
    baseStitch.y - Math.cos(angle) * thickness / 2
  );

  const parseColor = (col: string) => {
    if (col.startsWith('#')) {
      const hex = col.replace('#', '');
      return {
        r: parseInt(hex.substr(0, 2), 16) || 128,
        g: parseInt(hex.substr(2, 2), 16) || 128,
        b: parseInt(hex.substr(4, 2), 16) || 128,
      };
    }
    return { r: 128, g: 128, b: 128 };
  };

  const { r, g, b } = parseColor(workingStitch.color);

  gradient.addColorStop(0, `rgb(${Math.max(0, r - 30)}, ${Math.max(0, g - 30)}, ${Math.max(0, b - 30)})`);
  gradient.addColorStop(0.5, workingStitch.color);
  gradient.addColorStop(1, `rgb(${Math.max(0, r - 30)}, ${Math.max(0, g - 30)}, ${Math.max(0, b - 30)})`);

  ctx.strokeStyle = gradient;
  ctx.lineWidth = thickness;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(baseStitch.x, baseStitch.y);
  ctx.lineTo(workingStitch.x, workingStitch.y);
  ctx.stroke();

  ctx.restore();
}

// Draw stitch as a node (sphere in 3D, circle in 2D)
function _drawStitchNode(
  ctx: CanvasRenderingContext2D,
  stitch: Stitch
) {
  if (stitch.animationProgress < 0.1) return;

  const radius = 8; // Node size
  const { x, y, color, animationProgress } = stitch;

  ctx.save();
  ctx.globalAlpha = animationProgress;

  // Shadow for depth
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 3;

  // Create radial gradient for 3D sphere effect
  const gradient = ctx.createRadialGradient(
    x - radius * 0.3,
    y - radius * 0.3,
    radius * 0.1,
    x,
    y,
    radius
  );

  const parseColor = (col: string) => {
    if (col.startsWith('#')) {
      const hex = col.replace('#', '');
      return {
        r: parseInt(hex.substr(0, 2), 16) || 128,
        g: parseInt(hex.substr(2, 2), 16) || 128,
        b: parseInt(hex.substr(4, 2), 16) || 128,
      };
    }
    return { r: 128, g: 128, b: 128 };
  };

  const { r, g, b } = parseColor(color);

  gradient.addColorStop(0, `rgb(${Math.min(255, r + 60)}, ${Math.min(255, g + 60)}, ${Math.min(255, b + 60)})`);
  gradient.addColorStop(0.4, color);
  gradient.addColorStop(1, `rgb(${Math.max(0, r - 50)}, ${Math.max(0, g - 50)}, ${Math.max(0, b - 50)})`);

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius * animationProgress, 0, Math.PI * 2);
  ctx.fill();

  // Add highlight
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.beginPath();
  ctx.arc(x - radius * 0.25, y - radius * 0.25, radius * 0.3 * animationProgress, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// Draw yarn connection between adjacent stitches - THICK and connected
function _drawYarnConnection(
  ctx: CanvasRenderingContext2D,
  stitch1: Stitch,
  stitch2: Stitch
) {
  if (stitch1.animationProgress < 1 || stitch2.animationProgress < 0.1) {
    return; // Don't draw connection until both stitches are visible
  }

  const thickness = 12; // Thick yarn to eliminate all gaps
  const dx = stitch2.x - stitch1.x;
  const dy = stitch2.y - stitch1.y;
  const angle = Math.atan2(dy, dx);
  const length = Math.sqrt(dx * dx + dy * dy);

  ctx.save();

  // Shadow - more pronounced
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.lineWidth = thickness + 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(stitch1.x + 1.5, stitch1.y + 2);
  ctx.lineTo(stitch2.x + 1.5, stitch2.y + 2);
  ctx.stroke();

  // Main yarn with cylindrical gradient
  const gradient = ctx.createLinearGradient(
    stitch1.x - Math.sin(angle) * thickness / 2,
    stitch1.y + Math.cos(angle) * thickness / 2,
    stitch1.x + Math.sin(angle) * thickness / 2,
    stitch1.y - Math.cos(angle) * thickness / 2
  );

  const color = stitch1.color;
  const parseColor = (col: string) => {
    if (col.startsWith('#')) {
      const hex = col.replace('#', '');
      return {
        r: parseInt(hex.substr(0, 2), 16) || 128,
        g: parseInt(hex.substr(2, 2), 16) || 128,
        b: parseInt(hex.substr(4, 2), 16) || 128,
      };
    }
    return { r: 128, g: 128, b: 128 };
  };

  const { r, g, b } = parseColor(color);

  gradient.addColorStop(0, `rgb(${Math.max(0, r - 40)}, ${Math.max(0, g - 40)}, ${Math.max(0, b - 40)})`);
  gradient.addColorStop(0.3, `rgb(${Math.max(0, r - 15)}, ${Math.max(0, g - 15)}, ${Math.max(0, b - 15)})`);
  gradient.addColorStop(0.5, color);
  gradient.addColorStop(0.7, `rgb(${Math.min(255, r + 20)}, ${Math.min(255, g + 20)}, ${Math.min(255, b + 20)})`);
  gradient.addColorStop(1, `rgb(${Math.max(0, r - 40)}, ${Math.max(0, g - 40)}, ${Math.max(0, b - 40)})`);

  ctx.strokeStyle = gradient;
  ctx.lineWidth = thickness;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(stitch1.x, stitch1.y);
  ctx.lineTo(stitch2.x, stitch2.y);
  ctx.stroke();

  // Add texture bumps along the connection
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  const segments = Math.max(2, Math.floor(length / 10));
  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    const x = stitch1.x + dx * t;
    const y = stitch1.y + dy * t;
    ctx.beginPath();
    ctx.arc(
      x - Math.sin(angle) * thickness * 0.2,
      y + Math.cos(angle) * thickness * 0.2,
      thickness * 0.12,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  // Bright highlight
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = thickness * 0.3;
  ctx.beginPath();
  ctx.moveTo(
    stitch1.x - Math.sin(angle) * thickness * 0.2,
    stitch1.y + Math.cos(angle) * thickness * 0.2
  );
  ctx.lineTo(
    stitch2.x - Math.sin(angle) * thickness * 0.2,
    stitch2.y + Math.cos(angle) * thickness * 0.2
  );
  ctx.stroke();

  ctx.restore();
}

// Calculate total number of stitches in a pattern
export function getTotalStitchCount(pattern: CrochetPattern): number {
  let total = 0;
  pattern.rows.forEach(row => {
    row.forEach(instruction => {
      total += instruction.count;
    });
  });
  return total;
}

// Get stitch index by row and position in row
export function getStitchIndexByPosition(
  pattern: CrochetPattern,
  rowIndex: number,
  stitchInRow: number
): number {
  let index = 0;

  for (let r = 0; r < rowIndex && r < pattern.rows.length; r++) {
    pattern.rows[r].forEach(instruction => {
      index += instruction.count;
    });
  }

  if (rowIndex < pattern.rows.length) {
    let countInRow = 0;
    for (const instruction of pattern.rows[rowIndex]) {
      if (countInRow + instruction.count > stitchInRow) {
        index += stitchInRow - countInRow;
        break;
      }
      countInRow += instruction.count;
      index += instruction.count;
    }
  }

  return index;
}

// Get row and position from stitch index
export function getPositionFromStitchIndex(
  pattern: CrochetPattern,
  stitchIndex: number
): { rowIndex: number; stitchInRow: number } {
  let currentIndex = 0;
  let rowIndex = 0;
  let stitchInRow = 0;

  for (let r = 0; r < pattern.rows.length; r++) {
    let rowSize = 0;
    pattern.rows[r].forEach(instruction => {
      rowSize += instruction.count;
    });

    if (currentIndex + rowSize > stitchIndex) {
      rowIndex = r;
      stitchInRow = stitchIndex - currentIndex;
      break;
    }

    currentIndex += rowSize;
  }

  return { rowIndex, stitchInRow };
}

// Get current instruction being animated
export function getCurrentInstruction(
  pattern: CrochetPattern,
  stitchIndex: number
): StitchInstruction | null {
  const { rowIndex, stitchInRow } = getPositionFromStitchIndex(pattern, stitchIndex);

  if (rowIndex >= pattern.rows.length) {
    return null;
  }

  let countInRow = 0;
  for (const instruction of pattern.rows[rowIndex]) {
    if (countInRow + instruction.count > stitchInRow) {
      return instruction;
    }
    countInRow += instruction.count;
  }

  return null;
}
