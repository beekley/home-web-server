interface SvgData {
  yLabel: string;
  xLabel: string;
  series: Record<string, number[]>;
  title: string;
}

export function renderSvg(
  data: SvgData,
  width: number = 800,
  height: number = 150,
  lineColors: string[] = ["#0074d9", "#82b7e5ff"],
  fillColors: string[] = ["rgba(0, 116, 217, 0.1)", "rgba(130, 183, 229, 0.1)"],
): string {
  const serieses = Object.entries(data.series);
  if (serieses.length === 0) return "";

  // TODO: make this configurable
  const maxVal = 20;

  // Return SVG String
  return `
    <summary>
    <div style="font-size: 14px; font-weight: 500; color: #333; margin-bottom: 5px;">${
      data.title
    }</div>
    <svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="none" style="background: #f8f9fa; border-radius: 2px; border: 1px solid #e9ecef;">
        <!-- Grid Lines (Optional) -->
        ${[0.25, 0.5, 0.75]
          .map(
            (factor) =>
              `<line x1="0" y1="${height * factor}" x2="${width}" y2="${
                height * factor
              }" stroke="#e9ecef" stroke-width="1" />`,
          )
          .join("\n")}

        ${Object.entries(data.series)
          .map(([key, series], seriesIndex) => {
            const stepX = width / (series.length - 1);
            const points = series
              .map((pt) => (isNaN(pt) ? 0 : pt)) // Skip NaN values
              .map((pt, i) => {
                const x = i * stepX;
                const y = height - (pt / maxVal) * height;
                return `${x.toFixed(1)},${y.toFixed(1)}`;
              })
              .join(" ");

            const fillColor = fillColors[seriesIndex % fillColors.length];
            const lineColor = lineColors[seriesIndex % lineColors.length];

            return `<!-- Series: ${key} --> <polygon points="0,${height} ${points} ${width},${height}" fill="${fillColor}" /><polyline points="${points}" fill="none" stroke="${lineColor}" stroke-width="2" vector-effect="non-scaling-stroke" />`;
          })
          .join("\n")}
        
    </svg>
    </summary>
    `;
}
