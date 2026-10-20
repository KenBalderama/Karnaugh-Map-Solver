import { FormatVariable } from './FormatVariable';

export type TruthTableOutput = '0' | '1' | 'X';

type TruthTableProps = {
  variableCount: number;
  variableNames: string[];
  outputs: TruthTableOutput[];
  onCycleOutput: (rowIndex: number) => void;
};

export function TruthTable({
  variableCount,
  variableNames,
  outputs,
  onCycleOutput,
}: TruthTableProps) {
  const rowCount = 1 << variableCount;

  return (
    <div className="overflow-x-auto rounded-lg border border-[#e4e1d8] bg-[#fffefb]" data-testid="truth-table-container">
      <table className="w-full border-collapse text-[12px]" aria-label="Truth table" data-testid="truth-table">
        <thead>
          <tr className="border-b border-[#e4e1d8] bg-[#f7f5ef]">
            {variableNames.slice(0, variableCount).map((name, index) => (
              <th
                key={`${name}-${index}`}
                scope="col"
                className="px-3 py-2.5 text-center font-semibold text-[#4f5d60]"
              >
                <FormatVariable name={name} />
              </th>
            ))}
            <th scope="col" className="border-l border-[#e4e1d8] px-3 py-2.5 text-center font-semibold text-[#4f5d60]">
              F
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rowCount }, (_, rowIndex) => {
            const bits = rowIndex.toString(2).padStart(variableCount, '0');
            const output = outputs[rowIndex] ?? '0';
            const nextOutput: Record<TruthTableOutput, TruthTableOutput> = {
              '0': '1',
              '1': 'X',
              X: '0',
            };

            return (
              <tr
                key={rowIndex}
                className="border-b border-[#eeece5] last:border-b-0"
                data-testid={`truth-table-row-${rowIndex}`}
              >
                {bits.split('').map((bit, columnIndex) => (
                  <td
                    key={columnIndex}
                    className="px-3 py-2 text-center font-mono text-[#66727a]"
                    data-testid={`truth-table-input-${rowIndex}-${columnIndex}`}
                  >
                    {bit}
                  </td>
                ))}
                <td className="border-l border-[#e4e1d8] px-2 py-1 text-center">
                  <button
                    type="button"
                    onClick={() => onCycleOutput(rowIndex)}
                    aria-label={`Input ${bits}, output ${output}. Click to change to ${nextOutput[output]}.`}
                    className={`min-h-8 min-w-10 rounded-md px-2 font-mono text-[13px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#43867d] focus-visible:ring-offset-1 ${
                      output === 'X'
                        ? 'text-[#777f80] hover:bg-[#f1efe9]'
                        : output === '1'
                          ? 'text-[#286c65] hover:bg-[#edf2ec]'
                          : 'text-[#53616b] hover:bg-[#f1efe9]'
                    }`}
                    data-testid={`button-truth-table-output-${rowIndex}`}
                  >
                    {output}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
