interface SvgData {
  yLabel: string;
  xLabel: string;
  series: number[][];
  title: string;
}

export function renderSvg(
  data: SvgData,
  width: number = 800,
  height: number = 150,
  lineColors: string[] = ["#0074d9", "#82b7e5ff"],
  fillColor: string = "rgba(0, 116, 217, 0.1)",
): string {
  if (data.series.length === 0 || data.series[0].length < 2) {
    return `<div style="text-align:center; padding: 20px; color: #666;">Not enough data to render SVG.</div>`;
  }
  const maxVal = Math.max(...data.series[0]);

  const stepX = width / (data.series[0].length - 1);

  // Generate Points for the primary line
  const points = data.series[0]
    .map((pt, i) => {
      const x = i * stepX;
      const y = height - (pt / maxVal) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  // Return SVG String
  return `
    <summary>
    <div style="font-size: 14px; font-weight: 500; color: #333; margin-bottom: 5px;">${
      data.title
    }</div>
    <svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="none" style="background: #f8f9fa; border-radius: 2px; border: 1px solid #e9ecef;">
        <!-- Grid Lines (Optional) -->
        <line x1="0" y1="${height * 0.25}" x2="${width}" y2="${
          height * 0.25
        }" stroke="#e9ecef" stroke-width="1" />
        <line x1="0" y1="${height * 0.5}" x2="${width}" y2="${
          height * 0.5
        }" stroke="#e9ecef" stroke-width="1" />
        <line x1="0" y1="${height * 0.75}" x2="${width}" y2="${
          height * 0.75
        }" stroke="#e9ecef" stroke-width="1" />

        <!-- The Data Fill -->
        <polygon points="0,${height} ${points} ${width},${height}" fill="${fillColor}" />
        
        <!-- The Data Line -->
        <polyline points="${points}" fill="none" stroke="${
          lineColors[0]
        }" stroke-width="2" vector-effect="non-scaling-stroke" />
    </svg>
    </summary>
    `;
}
