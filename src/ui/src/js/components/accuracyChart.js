// Hand-inked chalk chart: wrapped-bar accuracy history (Du Bois raise).
// Pure SVG geometry — each round is a bar whose height is the score (lower = better),
// wrapped into rows of `perRow` bars, drawn with chalk stroke and hand-tilt.

export function accuracyChart(rounds, { width = 640, perRow = 12 } = {}) {
  const data = rounds.filter((r) => typeof r.score === 'number');
  const rows = Math.max(1, Math.ceil(data.length / perRow));
  const barW = 22;
  const barGap = 8;
  const chartH = 120;
  const labelH = 22;
  const rowGap = 26;
  const height = rows * (chartH + labelH + rowGap);
  const max = Math.max(10, ...data.map((r) => r.score));

  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('width', '100%');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Guess accuracy by round: each bar is one round, taller means further off');

  data.forEach((r, i) => {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    const x = col * (barW + barGap) + 10;
    const yBase = row * (chartH + labelH + rowGap) + chartH;
    const h = Math.max(3, (r.score / max) * (chartH - 20));

    const bar = document.createElementNS(ns, 'rect');
    bar.setAttribute('x', x);
    bar.setAttribute('y', yBase - h);
    bar.setAttribute('width', barW);
    bar.setAttribute('height', h);
    bar.setAttribute('rx', 3);
    bar.setAttribute('fill', r.score < 5 ? 'rgba(228,233,224,0.9)' : 'rgba(228,233,224,0.35)');
    bar.setAttribute('stroke', '#cfd6ca');
    bar.setAttribute('stroke-width', '1.5');
    bar.setAttribute('transform', `rotate(${(i % 3) - 1} ${x + barW / 2} ${yBase})`);
    bar.appendChild(document.createElementNS(ns, 'title')).textContent =
      `round score ${r.score.toFixed(2)}`;
    svg.append(bar);

    // baseline stroke under each row
    if (col === 0) {
      const line = document.createElementNS(ns, 'line');
      line.setAttribute('x1', 6);
      line.setAttribute('x2', width - 10);
      line.setAttribute('y1', yBase + 1);
      line.setAttribute('y2', yBase + 1);
      line.setAttribute('stroke', '#8b968a');
      line.setAttribute('stroke-width', '2');
      line.setAttribute('stroke-dasharray', 'none');
      svg.append(line);
    }
  });
  return svg;
}
