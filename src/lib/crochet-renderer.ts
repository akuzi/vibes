// Crochet rendering utilities

import {
  Stitch,
  StitchInstruction,
  StitchType,
  STITCH_DIMENSIONS,
  drawStitch,
  drawStitchRealistic,
} from './crochet-stitches';
import { CrochetPattern } from './crochet-patterns';

// Build all stitches from a pattern
export function buildStitchesFromPattern(
  pattern: CrochetPattern,
  canvasWidth: number,
  canvasHeight: number
): Stitch[] {
  const stitches: Stitch[] = [];
  let stitchId = 0;

  if (pattern.workInRound) {
    // In-the-round layout (circular/spiral from center)
    buildInTheRound(pattern, stitches, canvasWidth, canvasHeight, stitchId);
  } else {
    // Flat work layout (rows from bottom to top)
    buildFlatWork(pattern, stitches, canvasWidth, canvasHeight, stitchId);
  }

  return stitches;
}

// Build flat work (rows) - CrochetPARADE-inspired node-based approach
function buildFlatWork(
  pattern: CrochetPattern,
  stitches: Stitch[],
  canvasWidth: number,
  canvasHeight: number,
  startId: number
) {
  let stitchId = startId;
  const paddingX = 40;
  const paddingY = 60;
  const stitchSpacing = 20; // Horizontal spacing between stitch nodes
  const rowHeight = 35; // Vertical spacing between rows

  let currentY = canvasHeight - paddingY;

  pattern.rows.forEach((row, rowIndex) => {
    // Count total stitches in row
    let totalStitches = 0;
    row.forEach(instruction => {
      totalStitches += instruction.count;
    });

    // Calculate total width and center the row
    const totalWidth = totalStitches * stitchSpacing;
    let currentX = (canvasWidth - totalWidth) / 2;

    // Create stitches for this row (nodes in the mesh)
    let stitchInRow = 0;
    row.forEach(instruction => {
      const color = instruction.color || pattern.defaultColor;

      for (let i = 0; i < instruction.count; i++) {
        stitches.push({
          id: `stitch-${stitchId++}`,
          type: instruction.type,
          x: currentX,
          y: currentY,
          color,
          rowIndex,
          stitchIndex: stitchInRow,
          animationProgress: 0,
        });

        currentX += stitchSpacing;
        stitchInRow++;
      }
    });

    // Move up for next row
    currentY -= rowHeight;
  });
}

// Build in-the-round (circular)
function buildInTheRound(
  pattern: CrochetPattern,
  stitches: Stitch[],
  canvasWidth: number,
  canvasHeight: number,
  startId: number
) {
  let stitchId = startId;
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  let currentRadius = 0;
  const radiusIncrement = 25;

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
        const ringRadius = 15;
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

      currentRadius = radiusIncrement;
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
    // Draw continuous yarn cylinder molded into crochet shape
    drawContinuousYarn(ctx, stitches, currentStitchIndex);
  } else {
    // Chart mode - just draw stitches
    for (let i = 0; i <= currentStitchIndex && i < stitches.length; i++) {
      drawStitch(ctx, stitches[i]);
    }
  }
}

// Draw continuous yarn cylinder molded into crochet shape
function drawContinuousYarn(
  ctx: CanvasRenderingContext2D,
  stitches: Stitch[],
  currentStitchIndex: number
) {
  if (currentStitchIndex < 0 || stitches.length === 0) return;

  const yarnThickness = 14; // Thick continuous yarn
  const loopSize = 12; // Size of loops at each stitch point

  // Build continuous path through all stitches
  const yarnPath: { x: number; y: number; depth: number }[] = [];

  for (let i = 0; i <= currentStitchIndex && i < stitches.length; i++) {
    const stitch = stitches[i];
    const progress = stitch.animationProgress;
    if (progress < 0.1) continue;

    // Find the stitch this one is worked into (below in previous row)
    const stitchBelow = findStitchBelow(stitches, stitch);

    // Create loop path for this stitch
    if (i === 0) {
      // First stitch - just start point
      yarnPath.push({ x: stitch.x, y: stitch.y, depth: 0 });
    } else {
      const prevStitch = stitches[i - 1];

      // If working into a stitch below, create a loop
      if (stitchBelow && stitchBelow.animationProgress >= 1) {
        // Create path that goes: prev -> down to base -> through base -> up to current -> loop -> continue

        // 1. Curve down toward the base stitch
        const midY1 = (prevStitch.y + stitchBelow.y) / 2;
        yarnPath.push({ x: prevStitch.x + loopSize * 0.3, y: midY1, depth: -0.5 });

        // 2. Through the base stitch (behind)
        yarnPath.push({ x: stitchBelow.x - loopSize * 0.4, y: stitchBelow.y, depth: -1 });
        yarnPath.push({ x: stitchBelow.x, y: stitchBelow.y, depth: -1 });
        yarnPath.push({ x: stitchBelow.x + loopSize * 0.4, y: stitchBelow.y, depth: -1 });

        // 3. Curve up toward current stitch
        const midY2 = (stitchBelow.y + stitch.y) / 2;
        yarnPath.push({ x: stitch.x - loopSize * 0.3, y: midY2, depth: -0.5 });

        // 4. Form the stitch loop (visible part)
        yarnPath.push({ x: stitch.x - loopSize * 0.5, y: stitch.y, depth: 0 });
        yarnPath.push({ x: stitch.x - loopSize * 0.3, y: stitch.y - loopSize * 0.6, depth: 0.3 }); // Back top
        yarnPath.push({ x: stitch.x, y: stitch.y - loopSize * 0.7, depth: 0.5 }); // Top center
        yarnPath.push({ x: stitch.x + loopSize * 0.3, y: stitch.y - loopSize * 0.6, depth: 0.3 }); // Front top
        yarnPath.push({ x: stitch.x + loopSize * 0.5, y: stitch.y, depth: 0 });
      } else {
        // No stitch below, just connect to previous (chain stitch)
        // Create a small loop
        const midX = (prevStitch.x + stitch.x) / 2;
        const midY = (prevStitch.y + stitch.y) / 2;

        yarnPath.push({ x: midX - loopSize * 0.3, y: midY - loopSize * 0.3, depth: -0.5 });
        yarnPath.push({ x: stitch.x - loopSize * 0.5, y: stitch.y, depth: -0.5 });
        yarnPath.push({ x: stitch.x, y: stitch.y - loopSize * 0.5, depth: 0 });
        yarnPath.push({ x: stitch.x + loopSize * 0.5, y: stitch.y, depth: 0.5 });
        yarnPath.push({ x: stitch.x, y: stitch.y, depth: 0 });
      }
    }
  }

  // Draw the continuous yarn path as thick cylinder
  for (let i = 1; i < yarnPath.length; i++) {
    const p1 = yarnPath[i - 1];
    const p2 = yarnPath[i];

    // Vary thickness slightly based on depth for 3D effect
    const depthFactor = (p1.depth + p2.depth) / 2;
    const thickness = yarnThickness * (1 + depthFactor * 0.15);

    // Get color from current stitch being drawn
    const currentStitch = stitches[Math.min(currentStitchIndex, stitches.length - 1)];
    const color = currentStitch.color;

    // Draw yarn segment with depth-based brightness
    drawYarnSegment(ctx, p1.x, p1.y, p2.x, p2.y, color, thickness, depthFactor);
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

// Find the stitch directly below in the previous row (worked-into relationship)
function findStitchBelow(stitches: Stitch[], currentStitch: Stitch): Stitch | null {
  // Find stitch in previous row at same or nearby position
  const prevRowStitches = stitches.filter(s => s.rowIndex === currentStitch.rowIndex - 1);
  if (prevRowStitches.length === 0) return null;

  // Find closest stitch by stitchIndex
  let closest = prevRowStitches[0];
  let minDiff = Math.abs(closest.stitchIndex - currentStitch.stitchIndex);

  for (const stitch of prevRowStitches) {
    const diff = Math.abs(stitch.stitchIndex - currentStitch.stitchIndex);
    if (diff < minDiff) {
      minDiff = diff;
      closest = stitch;
    }
  }

  return closest;
}

// Draw worked-into connection (vertical connection to stitch below)
function drawWorkedIntoConnection(
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
function drawStitchNode(
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
function drawYarnConnection(
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
