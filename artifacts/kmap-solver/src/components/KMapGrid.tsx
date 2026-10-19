type KMapGridProps = {
  variableCount: number;
  variableNames: string[];
};

type MapPanelConfig = {
  key: string;
  rowVariables: string[];
  columnVariables: string[];
  fixedBits: string;
  fixedLabel?: string;
};

const GRAY_CODE_VALUES: Record<number, number[]> = {
  1: [0, 1],
  2: [0, 1, 3, 2],
};

function toBits(value: number, width: number) {
  return value.toString(2).padStart(width, '0');
}

function getMapPanels(variableCount: number, variableNames: string[]): MapPanelConfig[] {
  if (variableCount === 2) {
    return [{
      key: 'map',
      rowVariables: variableNames.slice(0, 1),
      columnVariables: variableNames.slice(1, 2),
      fixedBits: '',
    }];
  }

  if (variableCount === 3) {
    return [{
      key: 'map',
      rowVariables: variableNames.slice(0, 1),
      columnVariables: variableNames.slice(1, 3),
      fixedBits: '',
    }];
  }

  if (variableCount === 4) {
    return [{
      key: 'map',
      rowVariables: variableNames.slice(0, 2),
      columnVariables: variableNames.slice(2, 4),
      fixedBits: '',
    }];
  }

  return [0, 1].map((fixedValue) => ({
    key: `map-${fixedValue}`,
    rowVariables: variableNames.slice(1, 3),
    columnVariables: variableNames.slice(3, 5),
    fixedBits: String(fixedValue),
    fixedLabel: `${variableNames[0]} = ${fixedValue}`,
  }));
}

function MapPanel({ panel, variableCount }: { panel: MapPanelConfig; variableCount: number }) {
  const rowWidth = panel.rowVariables.length;
  const columnWidth = panel.columnVariables.length;
  const rowCodes = GRAY_CODE_VALUES[rowWidth];
  const columnCodes = GRAY_CODE_VALUES[columnWidth];

  return (
    <section className="min-w-0" aria-label={panel.fixedLabel ?? `${variableCount}-variable map`}>
      {panel.fixedLabel && (
        <h3 className="mb-2 text-center font-mono text-[11px] font-medium text-black" data-testid={`text-map-section-${panel.key}`}>
          {panel.fixedLabel}
        </h3>
      )}
      <div className="overflow-x-auto">
        <table
          className="w-full min-w-[300px] table-fixed border-collapse border border-black bg-white text-black"
          aria-label={`${panel.fixedLabel ? `${panel.fixedLabel}, ` : ''}${variableCount}-variable Karnaugh map`}
          data-testid={`table-kmap-${panel.key}`}
        >
          <colgroup>
            <col style={{ width: '76px' }} />
            {columnCodes.map((code) => <col key={code} />)}
          </colgroup>
          <thead>
            <tr>
              <th
                scope="col"
                className="relative h-12 border border-black p-0"
                style={{
                  backgroundImage: 'linear-gradient(to bottom right, transparent calc(50% - 0.6px), #111 50%, transparent calc(50% + 0.6px))',
                }}
                data-testid={`cell-kmap-corner-${panel.key}`}
              >
                <span className="absolute right-1.5 top-1 bg-white px-1 font-mono text-[9px] font-medium leading-3">
                  {panel.columnVariables.join('')}
                </span>
                <span className="absolute bottom-1 left-1 bg-white px-1 font-mono text-[9px] font-medium leading-3">
                  {panel.rowVariables.join('')}
                </span>
                <span className="sr-only">{panel.rowVariables.join('')} / {panel.columnVariables.join('')}</span>
              </th>
              {columnCodes.map((code) => (
                <th
                  key={code}
                  scope="col"
                  className="h-12 border border-black px-1 text-center font-mono text-[10px] font-normal"
                  data-testid={`text-kmap-column-${panel.key}-${toBits(code, columnWidth)}`}
                >
                  {toBits(code, columnWidth)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowCodes.map((rowCode) => {
              const rowBits = toBits(rowCode, rowWidth);
              return (
                <tr key={rowCode}>
                  <th
                    scope="row"
                    className="h-[68px] border border-black px-1 text-center font-mono text-[10px] font-normal"
                    data-testid={`text-kmap-row-${panel.key}-${rowBits}`}
                  >
                    {rowBits}
                  </th>
                  {columnCodes.map((columnCode) => {
                    const columnBits = toBits(columnCode, columnWidth);
                    const decimalIndex = Number.parseInt(`${panel.fixedBits}${rowBits}${columnBits}`, 2);
                    return (
                      <td
                        key={columnCode}
                        className="relative h-[68px] border border-black bg-white"
                        data-testid={`cell-kmap-${panel.key}-${rowBits}-${columnBits}`}
                      >
                        <span
                          className="absolute left-1 top-1 font-mono text-[9px] font-normal text-gray-400"
                          data-testid={`text-kmap-index-${panel.key}-${decimalIndex}`}
                        >
                          {decimalIndex}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function KMapGrid({ variableCount, variableNames }: KMapGridProps) {
  const panels = getMapPanels(variableCount, variableNames);

  return (
    <div
      className={`grid gap-6 ${panels.length > 1 ? 'grid-cols-1 min-[1250px]:grid-cols-2' : 'grid-cols-1'}`}
      data-testid="kmap-grid"
    >
      {panels.map((panel) => (
        <MapPanel key={panel.key} panel={panel} variableCount={variableCount} />
      ))}
    </div>
  );
}
