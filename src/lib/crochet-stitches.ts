// Crochet stitch types and drawing functions

export enum StitchType {
  CHAIN = 'ch',
  SINGLE_CROCHET = 'sc',
  SLIP_STITCH = 'sl',
  DOUBLE_CROCHET = 'dc',
  HALF_DOUBLE = 'hdc',
  TREBLE = 'tc',
  MAGIC_RING = 'mr',
  INCREASE = 'inc',
  DECREASE = 'dec',
}

export interface StitchInstruction {
  type: StitchType;
  count: number;
  color?: string;
}

export interface Stitch {
  id: string;
  type: StitchType;
  x: number;
  y: number;
  color: string;
  rowIndex: number;
  stitchIndex: number;
  animationProgress: number; // 0-1 for animation
}

// Visual dimensions for each stitch type
export const STITCH_DIMENSIONS = {
  [StitchType.CHAIN]: { width: 12, height: 8 },
  [StitchType.SINGLE_CROCHET]: { width: 14, height: 16 },
  [StitchType.SLIP_STITCH]: { width: 10, height: 12 },
  [StitchType.DOUBLE_CROCHET]: { width: 16, height: 24 },
  [StitchType.HALF_DOUBLE]: { width: 15, height: 20 },
  [StitchType.TREBLE]: { width: 18, height: 28 },
  [StitchType.MAGIC_RING]: { width: 20, height: 20 },
  [StitchType.INCREASE]: { width: 18, height: 16 },
  [StitchType.DECREASE]: { width: 12, height: 16 },
};

// Draw a chain stitch (small circle ○)
export function drawChain(
  ctx: CanvasRenderingContext2D,
  stitch: Stitch
) {
  const { x, y, color, animationProgress } = stitch;
  const radius = 5;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.globalAlpha = animationProgress;

  // Draw circle outline
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2 * animationProgress);
  ctx.stroke();

  ctx.restore();
}

// Draw a single crochet stitch (+ symbol)
export function drawSingleCrochet(
  ctx: CanvasRenderingContext2D,
  stitch: Stitch
) {
  const { x, y, color, animationProgress } = stitch;
  const size = 7;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.globalAlpha = animationProgress;

  // Draw vertical line
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x, y - size + (size * 2 * Math.min(animationProgress * 2, 1)));
  ctx.stroke();

  // Draw horizontal line
  if (animationProgress > 0.5) {
    const horProgress = (animationProgress - 0.5) * 2;
    ctx.beginPath();
    ctx.moveTo(x - size * horProgress, y);
    ctx.lineTo(x + size * horProgress, y);
    ctx.stroke();
  }

  ctx.restore();
}

// Draw a double crochet stitch (tall T with one cross bar)
export function drawDoubleCrochet(
  ctx: CanvasRenderingContext2D,
  stitch: Stitch
) {
  const { x, y, color, animationProgress } = stitch;
  const height = 16;
  const topWidth = 8;
  const crossWidth = 6;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.globalAlpha = animationProgress;

  // Draw vertical stem
  ctx.beginPath();
  ctx.moveTo(x, y + height / 2);
  ctx.lineTo(x, y + height / 2 - (height * Math.min(animationProgress * 1.5, 1)));
  ctx.stroke();

  // Draw top horizontal bar
  if (animationProgress > 0.6) {
    const topProgress = (animationProgress - 0.6) / 0.4;
    ctx.beginPath();
    ctx.moveTo(x - topWidth * topProgress, y - height / 2);
    ctx.lineTo(x + topWidth * topProgress, y - height / 2);
    ctx.stroke();
  }

  // Draw cross bar in middle
  if (animationProgress > 0.8) {
    const crossProgress = (animationProgress - 0.8) / 0.2;
    ctx.beginPath();
    ctx.moveTo(x - crossWidth * crossProgress, y);
    ctx.lineTo(x + crossWidth * crossProgress, y);
    ctx.stroke();
  }

  ctx.restore();
}

// Draw a half double crochet (medium T without cross bar)
export function drawHalfDouble(
  ctx: CanvasRenderingContext2D,
  stitch: Stitch
) {
  const { x, y, color, animationProgress } = stitch;
  const height = 12;
  const topWidth = 7;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.globalAlpha = animationProgress;

  // Draw vertical stem
  ctx.beginPath();
  ctx.moveTo(x, y + height / 2);
  ctx.lineTo(x, y + height / 2 - (height * Math.min(animationProgress * 1.5, 1)));
  ctx.stroke();

  // Draw top horizontal bar
  if (animationProgress > 0.6) {
    const topProgress = (animationProgress - 0.6) / 0.4;
    ctx.beginPath();
    ctx.moveTo(x - topWidth * topProgress, y - height / 2);
    ctx.lineTo(x + topWidth * topProgress, y - height / 2);
    ctx.stroke();
  }

  ctx.restore();
}

// Draw a treble crochet (very tall T with two cross bars)
export function drawTreble(
  ctx: CanvasRenderingContext2D,
  stitch: Stitch
) {
  const { x, y, color, animationProgress } = stitch;
  const height = 20;
  const topWidth = 9;
  const crossWidth = 6;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.globalAlpha = animationProgress;

  // Draw vertical stem
  ctx.beginPath();
  ctx.moveTo(x, y + height / 2);
  ctx.lineTo(x, y + height / 2 - (height * Math.min(animationProgress * 1.5, 1)));
  ctx.stroke();

  // Draw top horizontal bar
  if (animationProgress > 0.5) {
    const topProgress = (animationProgress - 0.5) / 0.5;
    ctx.beginPath();
    ctx.moveTo(x - topWidth * topProgress, y - height / 2);
    ctx.lineTo(x + topWidth * topProgress, y - height / 2);
    ctx.stroke();
  }

  // Draw first cross bar
  if (animationProgress > 0.7) {
    const cross1Progress = (animationProgress - 0.7) / 0.3;
    ctx.beginPath();
    ctx.moveTo(x - crossWidth * cross1Progress, y - height / 6);
    ctx.lineTo(x + crossWidth * cross1Progress, y - height / 6);
    ctx.stroke();
  }

  // Draw second cross bar
  if (animationProgress > 0.85) {
    const cross2Progress = (animationProgress - 0.85) / 0.15;
    ctx.beginPath();
    ctx.moveTo(x - crossWidth * cross2Progress, y + height / 6);
    ctx.lineTo(x + crossWidth * cross2Progress, y + height / 6);
    ctx.stroke();
  }

  ctx.restore();
}

// Draw a slip stitch (filled dot •)
export function drawSlipStitch(
  ctx: CanvasRenderingContext2D,
  stitch: Stitch
) {
  const { x, y, color, animationProgress } = stitch;
  const radius = 4;

  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = animationProgress;

  // Draw filled circle
  ctx.beginPath();
  ctx.arc(x, y, radius * animationProgress, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// Draw a magic ring (circle with center dot)
export function drawMagicRing(
  ctx: CanvasRenderingContext2D,
  stitch: Stitch
) {
  const { x, y, color, animationProgress } = stitch;
  const radius = 8;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.globalAlpha = animationProgress;

  // Draw circle outline
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2 * animationProgress);
  ctx.stroke();

  // Add center dot
  if (animationProgress > 0.5) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// Draw an increase (two + symbols side by side)
export function drawIncrease(
  ctx: CanvasRenderingContext2D,
  stitch: Stitch
) {
  const { x, y, color, animationProgress } = stitch;
  const size = 6;
  const spacing = 5;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.globalAlpha = animationProgress;

  // First + symbol (left)
  if (animationProgress > 0) {
    const progress1 = Math.min(animationProgress * 2, 1);
    const x1 = x - spacing;

    // Vertical line
    ctx.beginPath();
    ctx.moveTo(x1, y - size);
    ctx.lineTo(x1, y - size + (size * 2 * progress1));
    ctx.stroke();

    // Horizontal line
    if (progress1 > 0.5) {
      const horProgress = (progress1 - 0.5) * 2;
      ctx.beginPath();
      ctx.moveTo(x1 - size * horProgress, y);
      ctx.lineTo(x1 + size * horProgress, y);
      ctx.stroke();
    }
  }

  // Second + symbol (right)
  if (animationProgress > 0.5) {
    const progress2 = (animationProgress - 0.5) * 2;
    const x2 = x + spacing;

    // Vertical line
    ctx.beginPath();
    ctx.moveTo(x2, y - size);
    ctx.lineTo(x2, y - size + (size * 2 * progress2));
    ctx.stroke();

    // Horizontal line
    if (progress2 > 0.5) {
      const horProgress = (progress2 - 0.5) * 2;
      ctx.beginPath();
      ctx.moveTo(x2 - size * horProgress, y);
      ctx.lineTo(x2 + size * horProgress, y);
      ctx.stroke();
    }
  }

  ctx.restore();
}

// Draw a decrease (inverted A shape - two stitches merging to one)
export function drawDecrease(
  ctx: CanvasRenderingContext2D,
  stitch: Stitch
) {
  const { x, y, color, animationProgress } = stitch;
  const width = 10;
  const height = 10;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.globalAlpha = animationProgress;

  // Draw left diagonal line
  if (animationProgress > 0) {
    const progress1 = Math.min(animationProgress * 1.5, 1);
    ctx.beginPath();
    ctx.moveTo(x - width / 2, y + height / 2);
    ctx.lineTo(
      x - width / 2 + (width / 2) * progress1,
      y + height / 2 - height * progress1
    );
    ctx.stroke();
  }

  // Draw right diagonal line
  if (animationProgress > 0.33) {
    const progress2 = Math.min((animationProgress - 0.33) * 1.5, 1);
    ctx.beginPath();
    ctx.moveTo(x + width / 2, y + height / 2);
    ctx.lineTo(
      x + width / 2 - (width / 2) * progress2,
      y + height / 2 - height * progress2
    );
    ctx.stroke();
  }

  // Draw top bar connecting them
  if (animationProgress > 0.7) {
    const barProgress = (animationProgress - 0.7) / 0.3;
    ctx.beginPath();
    ctx.moveTo(x - 3 * barProgress, y - height / 2);
    ctx.lineTo(x + 3 * barProgress, y - height / 2);
    ctx.stroke();
  }

  ctx.restore();
}

// Main drawing dispatch function
export function drawStitch(
  ctx: CanvasRenderingContext2D,
  stitch: Stitch
) {
  switch (stitch.type) {
    case StitchType.CHAIN:
      drawChain(ctx, stitch);
      break;
    case StitchType.SINGLE_CROCHET:
      drawSingleCrochet(ctx, stitch);
      break;
    case StitchType.DOUBLE_CROCHET:
      drawDoubleCrochet(ctx, stitch);
      break;
    case StitchType.HALF_DOUBLE:
      drawHalfDouble(ctx, stitch);
      break;
    case StitchType.TREBLE:
      drawTreble(ctx, stitch);
      break;
    case StitchType.SLIP_STITCH:
      drawSlipStitch(ctx, stitch);
      break;
    case StitchType.MAGIC_RING:
      drawMagicRing(ctx, stitch);
      break;
    case StitchType.INCREASE:
      drawIncrease(ctx, stitch);
      break;
    case StitchType.DECREASE:
      drawDecrease(ctx, stitch);
      break;
  }
}

// Get stitch type display name
export function getStitchTypeName(type: StitchType): string {
  const names: Record<StitchType, string> = {
    [StitchType.CHAIN]: 'Chain (ch)',
    [StitchType.SINGLE_CROCHET]: 'Single Crochet (sc)',
    [StitchType.SLIP_STITCH]: 'Slip Stitch (sl st)',
    [StitchType.DOUBLE_CROCHET]: 'Double Crochet (dc)',
    [StitchType.HALF_DOUBLE]: 'Half Double Crochet (hdc)',
    [StitchType.TREBLE]: 'Treble Crochet (tc)',
    [StitchType.MAGIC_RING]: 'Magic Ring (mr)',
    [StitchType.INCREASE]: 'Increase (inc)',
    [StitchType.DECREASE]: 'Decrease (dec)',
  };
  return names[type];
}

// ============= REALISTIC 3D RENDERING =============

// Helper: Draw yarn strand with realistic texture
function drawYarnStrand(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  thickness: number = 8
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const angle = Math.atan2(dy, dx);
  const length = Math.sqrt(dx * dx + dy * dy);

  ctx.save();

  // Shadow for depth - more pronounced
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.lineWidth = thickness + 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1 + 1.5, y1 + 2);
  ctx.lineTo(x2 + 1.5, y2 + 2);
  ctx.stroke();

  // Main yarn body with radial gradient for cylindrical look
  const gradient = ctx.createLinearGradient(
    x1 - Math.sin(angle) * thickness / 2,
    y1 + Math.cos(angle) * thickness / 2,
    x1 + Math.sin(angle) * thickness / 2,
    y1 - Math.cos(angle) * thickness / 2
  );

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
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Yarn texture - small bumps along the strand
  ctx.strokeStyle = `rgba(255, 255, 255, 0.15)`;
  ctx.lineWidth = thickness * 0.6;
  const segments = Math.max(3, Math.floor(length / 8));
  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    const x = x1 + dx * t;
    const y = y1 + dy * t;
    const offset = thickness * 0.25;

    ctx.beginPath();
    ctx.arc(
      x - Math.sin(angle) * offset,
      y + Math.cos(angle) * offset,
      thickness * 0.15,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  // Bright highlight on top
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = thickness * 0.25;
  ctx.beginPath();
  ctx.moveTo(
    x1 - Math.sin(angle) * thickness * 0.2,
    y1 + Math.cos(angle) * thickness * 0.2
  );
  ctx.lineTo(
    x2 - Math.sin(angle) * thickness * 0.2,
    y2 + Math.cos(angle) * thickness * 0.2
  );
  ctx.stroke();

  ctx.restore();
}

// Helper: Parse color to RGB values
function parseColor(color: string): { r: number; g: number; b: number } {
  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    return {
      r: parseInt(hex.substr(0, 2), 16) || 0,
      g: parseInt(hex.substr(2, 2), 16) || 0,
      b: parseInt(hex.substr(4, 2), 16) || 0,
    };
  }

  // Handle rgb() colors
  if (color.startsWith('rgb')) {
    const matches = color.match(/\d+/g);
    if (matches && matches.length >= 3) {
      return {
        r: parseInt(matches[0]) || 0,
        g: parseInt(matches[1]) || 0,
        b: parseInt(matches[2]) || 0,
      };
    }
  }

  // Default to gray if can't parse
  return { r: 128, g: 128, b: 128 };
}

// Helper: Adjust color brightness
function adjustColor(color: string, amount: number): string {
  const { r, g, b } = parseColor(color);
  const newR = Math.max(0, Math.min(255, r + amount));
  const newG = Math.max(0, Math.min(255, g + amount));
  const newB = Math.max(0, Math.min(255, b + amount));
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

// Draw realistic yarn loop with 3D appearance
function drawYarnLoop(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  progress: number
) {
  const thickness = 12; // Thicker yarn to match new approach
  const segments = 24; // More segments for smoother loops
  const endAngle = Math.PI * 2 * progress;

  // Draw complete loop with depth-based shading
  for (let i = 0; i < segments && i / segments < progress; i++) {
    const angle1 = (i / segments) * endAngle - Math.PI / 2;
    const angle2 = ((i + 1) / segments) * endAngle - Math.PI / 2;

    const x1 = x + Math.cos(angle1) * radius;
    const y1 = y + Math.sin(angle1) * radius;
    const x2 = x + Math.cos(angle2) * radius;
    const y2 = y + Math.sin(angle2) * radius;

    // Vary brightness based on position for 3D depth
    const depthFactor = Math.sin(angle1) * 0.15;
    const adjustedColor = adjustColorBrightness(color, depthFactor * 50);

    drawYarnStrand(ctx, x1, y1, x2, y2, adjustedColor, thickness);
  }
}

// Realistic chain stitch - larger and thicker for better coverage
export function drawChainRealistic(
  ctx: CanvasRenderingContext2D,
  stitch: Stitch
) {
  const { x, y, color, animationProgress } = stitch;
  // Larger chain radius to eliminate gaps
  drawYarnLoop(ctx, x, y, 14, color, animationProgress);
}

// Realistic single crochet - shows interconnected loop structure
export function drawSingleCrochetRealistic(
  ctx: CanvasRenderingContext2D,
  stitch: Stitch
) {
  const { x, y, color, animationProgress } = stitch;
  const loopWidth = 24; // Wider for better coverage
  const loopHeight = 18; // Taller for better coverage
  const yarnThickness = 12; // Thicker yarn to eliminate gaps

  ctx.save();

  // Draw as a continuous oval loop showing the yarn path
  if (animationProgress > 0) {
    const segments = 16;
    const totalAngle = Math.PI * 2 * animationProgress;

    // Create oval loop path
    for (let i = 0; i < segments && i < segments * animationProgress; i++) {
      const angle1 = (i / segments) * totalAngle - Math.PI / 2;
      const angle2 = ((i + 1) / segments) * totalAngle - Math.PI / 2;

      // Oval shape - wider than tall
      const x1 = x + Math.cos(angle1) * (loopWidth / 2);
      const y1 = y + Math.sin(angle1) * (loopHeight / 2);
      const x2 = x + Math.cos(angle2) * (loopWidth / 2);
      const y2 = y + Math.sin(angle2) * (loopHeight / 2);

      // Vary brightness based on position for 3D effect
      const depthFactor = Math.sin(angle1) * 0.15; // Back half darker, front half lighter
      const adjustedColor = adjustColorBrightness(color, depthFactor * 50);

      drawYarnStrand(ctx, x1, y1, x2, y2, adjustedColor, yarnThickness);
    }
  }

  ctx.restore();
}

// Helper: Adjust color brightness for 3D depth effect
function adjustColorBrightness(color: string, amount: number): string {
  const { r, g, b } = parseColor(color);
  const newR = Math.max(0, Math.min(255, r + amount));
  const newG = Math.max(0, Math.min(255, g + amount));
  const newB = Math.max(0, Math.min(255, b + amount));
  return `rgb(${Math.round(newR)}, ${Math.round(newG)}, ${Math.round(newB)})`;
}

// Realistic double/half-double/treble crochet with thicker yarn
function drawCrochetPostRealistic(
  ctx: CanvasRenderingContext2D,
  stitch: Stitch,
  height: number,
  crossBars: number
) {
  const { x, y, color, animationProgress } = stitch;
  const topWidth = 12;

  // Draw vertical post with thick yarn
  if (animationProgress > 0) {
    const postProgress = Math.min(animationProgress * 1.2, 1);
    drawYarnStrand(ctx, x, y + height / 2, x, y + height / 2 - height * postProgress, color, 10);
  }

  // Draw top bar
  if (animationProgress > 0.6) {
    const topProgress = (animationProgress - 0.6) / 0.4;
    drawYarnStrand(ctx, x - topWidth * topProgress, y - height / 2, x + topWidth * topProgress, y - height / 2, color, 10);
  }

  // Draw cross bars
  if (crossBars >= 1 && animationProgress > 0.75) {
    const cross1Progress = (animationProgress - 0.75) / 0.25;
    const crossWidth = 10;
    drawYarnStrand(ctx, x - crossWidth * cross1Progress, y, x + crossWidth * cross1Progress, y, color, 8);
  }

  if (crossBars >= 2 && animationProgress > 0.85) {
    const cross2Progress = (animationProgress - 0.85) / 0.15;
    const crossWidth = 10;
    drawYarnStrand(ctx, x - crossWidth * cross2Progress, y + height / 4, x + crossWidth * cross2Progress, y + height / 4, color, 8);
  }
}

export function drawHalfDoubleRealistic(ctx: CanvasRenderingContext2D, stitch: Stitch) {
  drawCrochetPostRealistic(ctx, stitch, 14, 0);
}

export function drawDoubleCrochetRealistic(ctx: CanvasRenderingContext2D, stitch: Stitch) {
  drawCrochetPostRealistic(ctx, stitch, 18, 1);
}

export function drawTrebleRealistic(ctx: CanvasRenderingContext2D, stitch: Stitch) {
  drawCrochetPostRealistic(ctx, stitch, 22, 2);
}

// Realistic slip stitch (small knot)
export function drawSlipStitchRealistic(
  ctx: CanvasRenderingContext2D,
  stitch: Stitch
) {
  const { x, y, color, animationProgress } = stitch;

  ctx.save();
  ctx.fillStyle = color;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 2;
  ctx.shadowOffsetY = 1;
  ctx.beginPath();
  ctx.arc(x, y, 4 * animationProgress, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Realistic magic ring with larger radius
export function drawMagicRingRealistic(
  ctx: CanvasRenderingContext2D,
  stitch: Stitch
) {
  const { x, y, color, animationProgress } = stitch;
  // Larger magic ring to match other stitches
  drawYarnLoop(ctx, x, y, 14, color, animationProgress);

  // Center knot
  if (animationProgress > 0.5) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// Realistic increase/decrease
export function drawIncreaseRealistic(ctx: CanvasRenderingContext2D, stitch: Stitch) {
  const { x, y, color, animationProgress } = stitch;
  const size = 7;
  const spacing = 6;

  // Two stitches side by side
  if (animationProgress > 0) {
    const stitch1 = { ...stitch, x: x - spacing, animationProgress: Math.min(animationProgress * 2, 1) };
    drawSingleCrochetRealistic(ctx, stitch1);
  }
  if (animationProgress > 0.5) {
    const stitch2 = { ...stitch, x: x + spacing, animationProgress: (animationProgress - 0.5) * 2 };
    drawSingleCrochetRealistic(ctx, stitch2);
  }
}

export function drawDecreaseRealistic(ctx: CanvasRenderingContext2D, stitch: Stitch) {
  const { x, y, color, animationProgress } = stitch;
  const width = 16;
  const height = 12;

  // Two thick strands converging
  if (animationProgress > 0) {
    const progress1 = Math.min(animationProgress * 1.5, 1);
    drawYarnStrand(ctx, x - width / 2, y + height / 2, x, y - height / 2 * progress1, color, 10);
  }

  if (animationProgress > 0.4) {
    const progress2 = (animationProgress - 0.4) * 1.67;
    drawYarnStrand(ctx, x + width / 2, y + height / 2, x, y - height / 2 * progress2, color, 10);
  }

  // Top knot
  if (animationProgress > 0.8) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 1.5;
    ctx.beginPath();
    ctx.arc(x, y - height / 2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// Main realistic drawing dispatch
export function drawStitchRealistic(
  ctx: CanvasRenderingContext2D,
  stitch: Stitch
) {
  switch (stitch.type) {
    case StitchType.CHAIN:
      drawChainRealistic(ctx, stitch);
      break;
    case StitchType.SINGLE_CROCHET:
      drawSingleCrochetRealistic(ctx, stitch);
      break;
    case StitchType.DOUBLE_CROCHET:
      drawDoubleCrochetRealistic(ctx, stitch);
      break;
    case StitchType.HALF_DOUBLE:
      drawHalfDoubleRealistic(ctx, stitch);
      break;
    case StitchType.TREBLE:
      drawTrebleRealistic(ctx, stitch);
      break;
    case StitchType.SLIP_STITCH:
      drawSlipStitchRealistic(ctx, stitch);
      break;
    case StitchType.MAGIC_RING:
      drawMagicRingRealistic(ctx, stitch);
      break;
    case StitchType.INCREASE:
      drawIncreaseRealistic(ctx, stitch);
      break;
    case StitchType.DECREASE:
      drawDecreaseRealistic(ctx, stitch);
      break;
  }
}
