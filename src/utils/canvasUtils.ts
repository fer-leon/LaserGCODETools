export function drawCorrectionLegend(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const width = 100;
  const height = 15;
  const gradient = ctx.createLinearGradient(x, y, x + width, y);
  gradient.addColorStop(0, 'rgb(0, 0, 255)'); // no correction
  gradient.addColorStop(1, 'rgb(255, 0, 0)'); // full correction
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);
  ctx.fillStyle = '#000000';
  ctx.font = '10px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('0%', x, y + height + 12);
  ctx.fillText('100%', x + width, y + height + 12);
  ctx.fillText('Speed Reduction', x + width / 2, y + height + 24);
}

export function drawArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string,
  text?: string
) {
  const headLength = 10;
  const headAngle = Math.PI / 6;
  const angle = Math.atan2(toY - fromY, toX - fromX);
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - headLength * Math.cos(angle - headAngle),
    toY - headLength * Math.sin(angle - headAngle)
  );
  ctx.lineTo(
    toX - headLength * Math.cos(angle + headAngle),
    toY - headLength * Math.sin(angle + headAngle)
  );
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  if (text) {
    ctx.font = '14px Arial';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, toX + 15 * Math.cos(angle), toY + 15 * Math.sin(angle));
  }
}

export function distanceToLine(
  x: number, y: number,
  x1: number, y1: number,
  x2: number, y2: number
): number {
  const A = x - x1, B = y - y1, C = x2 - x1, D = y2 - y1;
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = lenSq !== 0 ? dot / lenSq : -1;
  let xx, yy;
  if (param < 0) { xx = x1; yy = y1; }
  else if (param > 1) { xx = x2; yy = y2; }
  else { xx = x1 + param * C; yy = y1 + param * D; }
  const dx = x - xx, dy = y - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

export function formatCoordinate(value: number): string {
  return value.toFixed(2);
}
