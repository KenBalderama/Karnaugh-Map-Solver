type KMapGridProps = {
  variableCount: number;
  variableNames: string[];
  cellValues: Record<number, '1' | 'X'>;
  groupPatterns: string[];
};

type MapPanelConfig = {
  key: string;
  rowVariableIndexes: number[];
  columnVariableIndexes: number[];
  fixedBits: string;
  fixedLabel?: string;
};

type CellCoordinate = {
  minterm: number;
  row: number;
  column: number;
};

type Segment = {
  start: number;
  end: number;
};

type GroupLoop = {
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
  openEdges: {
    top: boolean;
    right: boolean;
    bottom: boolean;
    left: boolean;
  };
};

const GRAY_CODE_VALUES: Record<number, number[]> = {
  1: [0, 1],
  2: [0, 1, 3, 2],
};

function toBits(value: number, width: number) {
  return value.toString(2).padStart(width, '0');
}

function getMapPanels(variableCount: number): MapPanelConfig[] {
  if (variableCount === 2) {
    return [{
      key: 'map',
      rowVariableIndexes: [0],
      columnVariableIndexes: [1],
      fixedBits: '',
    }];
  }

  if (variableCount === 3) {
    return [{
      key: 'map',
      rowVariableIndexes: [0],
      columnVariableIndexes: [1, 2],
      fixedBits: '',
    }];
  }

  if (variableCount === 4) {
    return [{
      key: 'map',
      rowVariableIndexes: [0, 1],
      columnVariableIndexes: [2, 3],
      fixedBits: '',
    }];
  }

  return [0, 1].map((fixedValue) => ({
    key: `map-${fixedValue}`,
    rowVariableIndexes: [1, 2],
    columnVariableIndexes: [3, 4],
    fixedBits: String(fixedValue),
    fixedLabel: String(fixedValue),
  }));
}

function getContiguousSegments(indices: number[]): Segment[] {
  const sorted = [...new Set(indices)].sort((left, right) => left - right);
  const segments: Segment[] = [];

  for (const index of sorted) {
    const previous = segments[segments.length - 1];
    if (previous && index === previous.end + 1) {
      previous.end = index;
    } else {
      segments.push({ start: index, end: index });
    }
  }

  return segments;
}

function patternCoversMinterm(pattern: string, minterm: number, variableCount: number): boolean {
  const bits = toBits(minterm, variableCount);
  return [...pattern].every((bit, index) => bit === '-' || bit === bits[index]);
}

function createOpenLoopPath(loop: GroupLoop): string {
  const { x, y, width, height, openEdges } = loop;
  const radius = Math.min(15, width / 2, height / 2);
  const right = x + width;
  const bottom = y + height;
  const paths: string[] = [];

  if (!openEdges.top) {
    const endX = openEdges.right ? right : right - radius;
    let path = `M ${x} ${openEdges.left ? y : y + radius}`;
    if (!openEdges.left) {
      path += ` Q ${x} ${y} ${x + radius} ${y}`;
    }
    path += ` L ${endX} ${y}`;
    if (!openEdges.right) {
      path += ` Q ${right} ${y} ${right} ${y + radius}`;
    }
    paths.push(path);
  }

  if (!openEdges.bottom) {
    let path = `M ${right} ${openEdges.right ? bottom : bottom - radius}`;
    if (!openEdges.right) {
      path += ` Q ${right} ${bottom} ${right - radius} ${bottom}`;
    }
    path += ` L ${openEdges.left ? x : x + radius} ${bottom}`;
    if (!openEdges.left) {
      path += ` Q ${x} ${bottom} ${x} ${bottom - radius}`;
    }
    paths.push(path);
  }

  if (!openEdges.right) {
    const startY = openEdges.top ? y : y + radius;
    const endY = openEdges.bottom ? bottom : bottom - radius;
    paths.push(`M ${right} ${startY} L ${right} ${endY}`);
  }

  if (!openEdges.left) {
    const startY = openEdges.bottom ? bottom : bottom - radius;
    const endY = openEdges.top ? y : y + radius;
    paths.push(`M ${x} ${startY} L ${x} ${endY}`);
  }

  return paths.join(' ');
}

function getGroupLoops(
  patterns: string[],
  cells: CellCoordinate[],
  rowCount: number,
  columnCount: number,
  variableCount: number,
): GroupLoop[] {
  const loops: GroupLoop[] = [];

  patterns.forEach((pattern, patternIndex) => {
    const coveredCells = cells.filter((cell) =>
      patternCoversMinterm(pattern, cell.minterm, variableCount),
    );
    const rows = getContiguousSegments(coveredCells.map((cell) => cell.row));
    const columns = getContiguousSegments(coveredCells.map((cell) => cell.column));
    const wrapsRows = rows.length > 1 && rows[0].start === 0 && rows.at(-1)?.end === rowCount - 1;
    const wrapsColumns = columns.length > 1
      && columns[0].start === 0
      && columns.at(-1)?.end === columnCount - 1;

    rows.forEach((row) => {
      columns.forEach((column) => {
        loops.push({
          key: `${patternIndex}-${row.start}-${column.start}`,
          x: column.start * 100 + 2,
          y: row.start * 100 + 2,
          width: (column.end - column.start + 1) * 100 - 4,
          height: (row.end - row.start + 1) * 100 - 4,
          openEdges: {
            top: wrapsRows && row.start === 0,
            right: wrapsColumns && column.end === columnCount - 1,
            bottom: wrapsRows && row.end === rowCount - 1,
            left: wrapsColumns && column.start === 0,
          },
        });
      });
    });
  });

  if (rowCount === 0 || columnCount === 0) {
    return [];
  }
  return loops;
}

function HorizontalBracket({ label, position }: { label: string; position: 'top' | 'bottom' }) {
  const top = position === 'top';

  return (
    <div className="relative h-full min-w-0" aria-hidden="true">
      <span className={`absolute inset-x-0 z-10 text-center font-mono text-[9px] leading-none text-[#b0b0b0] ${top ? 'top-0' : 'bottom-0'}`}>
        {label}
      </span>
      <svg
        className={`absolute inset-x-1 h-[7px] w-[calc(100%-8px)] text-[#c8c8c8] ${top ? 'bottom-0' : 'top-0'}`}
        viewBox="0 0 100 8"
        preserveAspectRatio="none"
      >
        <path
          d={top ? 'M1 7V3H99V7' : 'M1 1V5H99V1'}
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}

function RowBracket({ label }: { label: string }) {
  return (
    <div className="relative h-full" aria-hidden="true">
      <span className="absolute left-0 top-1/2 -translate-y-1/2 font-mono text-[9px] leading-none text-[#b0b0b0]">
        {label}
      </span>
      <svg className="absolute right-0 top-0 h-full w-[11px] text-[#c8c8c8]" viewBox="0 0 11 100" preserveAspectRatio="none">
        <path d="M10 1H4V99H10" fill="none" stroke="currentColor" strokeWidth="1" />
      </svg>
    </div>
  );
}

function MapPanel({
  panel,
  variableCount,
  variableNames,
  cellValues,
  groupPatterns,
}: {
  panel: MapPanelConfig;
  variableCount: number;
  variableNames: string[];
  cellValues: Record<number, '1' | 'X'>;
  groupPatterns: string[];
}) {
  const rowWidth = panel.rowVariableIndexes.length;
  const columnWidth = panel.columnVariableIndexes.length;
  const rowCodes = GRAY_CODE_VALUES[rowWidth];
  const columnCodes = GRAY_CODE_VALUES[columnWidth];
  const rowVariables = panel.rowVariableIndexes.map((index) => variableNames[index]);
  const columnVariables = panel.columnVariableIndexes.map((index) => variableNames[index]);
  const cells: CellCoordinate[] = rowCodes.flatMap((rowCode, row) => {
    const rowBits = toBits(rowCode, rowWidth);
    return columnCodes.map((columnCode, column) => {
      const columnBits = toBits(columnCode, columnWidth);
      return {
        minterm: Number.parseInt(`${panel.fixedBits}${rowBits}${columnBits}`, 2),
        row,
        column,
      };
    });
  });
  const groupLoops = getGroupLoops(
    groupPatterns,
    cells,
    rowCodes.length,
    columnCodes.length,
    variableCount,
  );
  const isThreeVariableMap = variableCount === 3;
  const topBracketColumns = isThreeVariableMap
    ? columnCodes.map((code, index) => ({ index, bits: toBits(code, columnWidth) }))
        .filter(({ bits }) => bits[0] === '1')
        .map(({ index }) => index)
    : [];
  const bottomBracketColumns = isThreeVariableMap
    ? columnCodes.map((code, index) => ({ index, bits: toBits(code, columnWidth) }))
        .filter(({ bits }) => bits[1] === '1')
        .map(({ index }) => index)
    : [];
  const rowBracketIndex = isThreeVariableMap
    ? rowCodes.findIndex((code) => toBits(code, rowWidth) === '1')
    : -1;
  const topBracketSegments = getContiguousSegments(topBracketColumns);
  const bottomBracketSegments = getContiguousSegments(bottomBracketColumns);
  const mapWidth = variableCount === 2
    ? 'min-w-[190px] max-w-[190px]'
    : 'min-w-[300px] max-w-[340px]';
  const layoutColumns = `28px 28px repeat(${columnCodes.length}, minmax(0, 1fr))`;
  const layoutRows = `18px 24px repeat(${rowCodes.length}, 58px) 20px`;
  const cellColumnStart = 3;
  const cellRowStart = 3;
  const cornerRowBits = rowVariables.join('');
  const cornerColumnBits = columnVariables.join('');

  return (
    <section className="min-w-0" aria-label={panel.fixedLabel ? `${variableNames[0]} = ${panel.fixedLabel}` : `${variableCount}-variable map`}>
      {panel.fixedLabel && (
        <h3 className="mb-1 text-center font-mono text-[10px] font-medium text-[#686868]" data-testid={`text-map-section-${panel.key}`}>
          {variableNames[0]} = {panel.fixedLabel}
        </h3>
      )}
      <div className={`mx-auto w-full ${mapWidth}`}>
        <div className="grid w-full text-black" style={{ gridTemplateColumns: layoutColumns, gridTemplateRows: layoutRows }}>
          <div
            className="relative"
            style={{ gridColumn: '1 / span 2', gridRow: '1 / span 2' }}
            data-testid={`cell-kmap-corner-${panel.key}`}
          >
            <span className="absolute right-0 top-0 font-mono text-[11px] leading-none text-black">
              {cornerColumnBits}
            </span>
            <span className="absolute bottom-0 left-0 font-mono text-[11px] leading-none text-black">
              {cornerRowBits}
            </span>
            <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 56 42" preserveAspectRatio="none" aria-hidden="true">
              <line x1="26" y1="12" x2="56" y2="42" stroke="#111111" strokeWidth="1" />
            </svg>
            <span className="sr-only">{cornerRowBits} \ {cornerColumnBits}</span>
          </div>

          {isThreeVariableMap && topBracketSegments.map((segment) => (
            <div
              key={`top-${segment.start}`}
              style={{
                gridRow: 1,
                gridColumn: `${cellColumnStart + segment.start} / span ${segment.end - segment.start + 1}`,
              }}
            >
              <HorizontalBracket label={columnVariables[0]} position="top" />
            </div>
          ))}

          {columnCodes.map((code, index) => (
            <div
              key={code}
              className="flex items-end justify-center pb-0.5 font-mono text-[10px] leading-none text-[#333]"
              style={{ gridRow: 2, gridColumn: cellColumnStart + index }}
              data-testid={`text-kmap-column-${panel.key}-${toBits(code, columnWidth)}`}
            >
              {toBits(code, columnWidth)}
            </div>
          ))}

          {rowCodes.map((code, rowIndex) => (
            <div
              key={code}
              className="flex items-center justify-center font-mono text-[10px] leading-none text-[#333]"
              style={{ gridRow: cellRowStart + rowIndex, gridColumn: 2 }}
              data-testid={`text-kmap-row-${panel.key}-${toBits(code, rowWidth)}`}
            >
              {toBits(code, rowWidth)}
            </div>
          ))}

          {isThreeVariableMap && rowBracketIndex >= 0 && (
            <div
              style={{ gridRow: cellRowStart + rowBracketIndex, gridColumn: 1 }}
              data-testid={`bracket-kmap-row-${panel.key}`}
            >
              <RowBracket label={rowVariables[0]} />
            </div>
          )}

          <div
            className="relative grid overflow-visible"
            role="grid"
            aria-label={`${panel.fixedLabel ? `${variableNames[0]} = ${panel.fixedLabel}, ` : ''}${variableCount}-variable Karnaugh map`}
            style={{
              gridRow: `${cellRowStart} / span ${rowCodes.length}`,
              gridColumn: `${cellColumnStart} / span ${columnCodes.length}`,
              gridTemplateColumns: `repeat(${columnCodes.length}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${rowCodes.length}, 58px)`,
              gap: '1px',
              border: '1px solid #111111',
              padding: '1px',
              backgroundColor: '#111111',
            }}
            data-testid={`grid-kmap-${panel.key}`}
          >
            {cells.map(({ minterm, row, column }) => (
              <div
                key={minterm}
                className="relative z-0 flex items-center justify-center bg-white"
                role="gridcell"
                aria-label={`Minterm ${minterm}${cellValues[minterm] ? `, value ${cellValues[minterm]}` : ''}`}
                data-testid={`cell-kmap-${panel.key}-${minterm}`}
              >
                <span
                  className="absolute left-1 top-1 z-30 font-mono text-[9px] italic leading-none text-[#b8b8b8]"
                  data-testid={`text-kmap-index-${panel.key}-${minterm}`}
                >
                  {minterm}
                </span>
                {cellValues[minterm] && (
                  <span
                    className={`relative z-30 font-sans text-[36px] font-bold leading-none ${cellValues[minterm] === 'X' ? 'text-[#606060]' : 'text-black'}`}
                    data-testid={`text-kmap-value-${panel.key}-${minterm}`}
                  >
                    {cellValues[minterm]}
                  </span>
                )}
                <span className="sr-only">Row {row + 1}, column {column + 1}</span>
              </div>
            ))}
            <svg
              className="pointer-events-none absolute inset-[2px] z-20 h-[calc(100%-4px)] w-[calc(100%-4px)]"
              viewBox={`0 0 ${columnCodes.length * 100} ${rowCodes.length * 100}`}
              preserveAspectRatio="none"
              aria-hidden="true"
              data-testid={`overlay-kmap-groups-${panel.key}`}
            >
              {groupLoops.map((loop) => {
                const isOpenEnded = Object.values(loop.openEdges).some(Boolean);
                if (isOpenEnded) {
                  return (
                    <path
                      key={loop.key}
                      d={createOpenLoopPath(loop)}
                      fill="none"
                      stroke="#21875a"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                      data-testid={`outline-kmap-group-${panel.key}-${loop.key}`}
                    />
                  );
                }

                return (
                  <rect
                    key={loop.key}
                    x={loop.x}
                    y={loop.y}
                    width={loop.width}
                    height={loop.height}
                    rx="15"
                    fill="none"
                    stroke="#21875a"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                    data-testid={`outline-kmap-group-${panel.key}-${loop.key}`}
                  />
                );
              })}
            </svg>
          </div>

          {isThreeVariableMap && bottomBracketSegments.map((segment) => (
            <div
              key={`bottom-${segment.start}`}
              style={{
                gridRow: cellRowStart + rowCodes.length,
                gridColumn: `${cellColumnStart + segment.start} / span ${segment.end - segment.start + 1}`,
              }}
            >
              <HorizontalBracket label={columnVariables[1]} position="bottom" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function KMapGrid({
  variableCount,
  variableNames,
  cellValues,
  groupPatterns,
}: KMapGridProps) {
  const panels = getMapPanels(variableCount);

  return (
    <div className={`grid gap-8 ${panels.length > 1 ? 'grid-cols-1 2xl:grid-cols-2' : 'grid-cols-1'}`} data-testid="kmap-grid">
      {panels.map((panel) => (
        <MapPanel
          key={panel.key}
          panel={panel}
          variableCount={variableCount}
          variableNames={variableNames}
          cellValues={cellValues}
          groupPatterns={groupPatterns}
        />
      ))}
    </div>
  );
}
