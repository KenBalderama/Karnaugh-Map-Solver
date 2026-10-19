import { useMemo, useState } from 'react';
import { Braces, ChevronDown, CircleHelp, Dot, Sigma } from 'lucide-react';
import { KMapGrid } from './components/KMapGrid';
import { simplifyBooleanFunction } from './lib/boolean-simplifier';

const INPUT_MODES = ['Truth Table', 'Minterms', 'Maxterms', 'Boolean Expression'] as const;
const DEFAULT_VARIABLE_NAMES = ['A', 'B', 'C', 'D', 'E'];

function parseMintermList(input: string, label: string): { minterms: number[]; error: string | null } {
  if (!input.trim()) {
    return { minterms: [], error: null };
  }

  const tokens = input.split(',');
  if (tokens.at(-1)?.trim() === '') {
    tokens.pop();
  }
  const trimmedTokens = tokens.map((token) => token.trim());

  if (trimmedTokens.some((token) => token.length === 0)) {
    return { minterms: [], error: `Use commas between ${label} indices.` };
  }
  if (trimmedTokens.some((token) => !/^\d+$/.test(token))) {
    return { minterms: [], error: `${label} must be comma-separated decimal indices.` };
  }

  return {
    minterms: [...new Set(trimmedTokens.map(Number))],
    error: null,
  };
}

function App() {
  const [variableCount, setVariableCount] = useState(3);
  const [variableNamesInput, setVariableNamesInput] = useState(DEFAULT_VARIABLE_NAMES.join(', '));
  const [inputMode, setInputMode] = useState<(typeof INPUT_MODES)[number]>('Minterms');
  const [values, setValues] = useState('');
  const [dontCares, setDontCares] = useState('');

  const activeVariableNames = useMemo(() => {
    const parsedVariableNames = variableNamesInput.split(',').map((name) => name.trim());
    return Array.from(
      { length: variableCount },
      (_, index) => parsedVariableNames[index] || DEFAULT_VARIABLE_NAMES[index],
    );
  }, [variableCount, variableNamesInput]);

  const mapDisplayData = useMemo(() => {
    if (inputMode !== 'Minterms') {
      return { cellValues: {}, groupPatterns: [], error: null };
    }

    const parsedMinterms = parseMintermList(values, 'Minterm');
    const parsedDontCares = parseMintermList(dontCares, 'Don’t-care');
    const error = parsedMinterms.error ?? parsedDontCares.error;
    if (error) {
      return { cellValues: {}, groupPatterns: [], error };
    }

    const cellValues: Record<number, '1' | 'X'> = {};
    parsedMinterms.minterms.forEach((minterm) => {
      cellValues[minterm] = '1';
    });
    parsedDontCares.minterms.forEach((minterm) => {
      cellValues[minterm] = 'X';
    });

    if (parsedMinterms.minterms.length === 0 && parsedDontCares.minterms.length === 0) {
      return { cellValues, groupPatterns: [], error: null };
    }

    try {
      const result = simplifyBooleanFunction({
        variableCount,
        minterms: parsedMinterms.minterms,
        dontCares: parsedDontCares.minterms,
        variableNames: activeVariableNames,
      });
      return {
        cellValues,
        groupPatterns: result.essentialPrimeImplicants.map((implicant) => implicant.pattern),
        error: null,
      };
    } catch (cause) {
      return {
        cellValues: {},
        groupPatterns: [],
        error: cause instanceof Error ? cause.message : 'Unable to map these minterms.',
      };
    }
  }, [activeVariableNames, dontCares, inputMode, values, variableCount]);

  return (
    <main className="min-h-[100dvh] bg-[#f5f2e9] text-[#263440]">
      <header className="border-b border-[#e3dfd4] bg-[#f8f6ef]">
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <a href="/" aria-label="K-map Studio home" className="flex items-center gap-3" data-testid="link-home">
            <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-[#286c65] text-[#f8f6ef]">
              <Sigma size={20} strokeWidth={2.1} aria-hidden="true" />
            </span>
            <span className="font-display text-[15px] font-extrabold tracking-[-0.045em]">K-map Studio</span>
          </a>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.13em] text-[#78817f]" data-testid="status-workbench">
            <span className="h-1.5 w-1.5 rounded-full bg-[#d37a56]" />
            Workbench
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-5 pb-12 pt-9 sm:px-8 sm:pt-12 lg:px-12">
        <section className="page-enter mb-8 flex flex-col justify-between gap-5 border-b border-[#e3dfd4] pb-7 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#39786f]">
              <span className="mono text-[10px]">01</span>
              <span className="h-px w-5 bg-[#9ab4aa]" />
              Boolean workspace
            </div>
            <h1 className="font-display text-[34px] font-bold leading-[1.08] tracking-[-0.055em] text-[#253541] sm:text-[42px]">
              Set up your function.
            </h1>
            <p className="mt-2 max-w-xl text-[14px] leading-6 text-[#6d7779]">
              Define the variables and input format before laying out your map.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start rounded-full border border-[#dfdbcf] bg-[#f1eee5] px-3 py-2 text-[11px] text-[#687371] sm:self-auto" data-testid="text-solver-scope">
            <CircleHelp size={14} strokeWidth={1.8} aria-hidden="true" />
            Setup only
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[minmax(340px,410px)_minmax(0,1fr)] lg:gap-6">
          <section className="page-enter rounded-2xl border border-[#e3dfd4] bg-[#fbfaf5] p-5 shadow-[0_10px_35px_rgba(53,61,55,0.035)] sm:p-6" aria-labelledby="function-setup-title">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <p className="mono mb-1 text-[10px] uppercase tracking-[0.14em] text-[#89918c]">Configuration</p>
                <h2 id="function-setup-title" className="font-display text-[19px] font-bold tracking-[-0.035em]">Function setup</h2>
              </div>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#edf2ec] text-[#37776e]">
                <Braces size={17} strokeWidth={1.8} aria-hidden="true" />
              </span>
            </div>

            <div className="space-y-6">
              <div>
                <label htmlFor="variable-count" className="mb-2 block text-[12px] font-semibold text-[#4f5d60]">Number of variables</label>
                <div className="relative">
                  <select
                    id="variable-count"
                    value={variableCount}
                    onChange={(event) => setVariableCount(Number(event.target.value))}
                    className="h-11 w-full appearance-none rounded-lg border border-[#dedbd1] bg-[#fffefb] px-3.5 pr-10 text-[13px] text-[#293941] outline-none transition focus:border-[#43867d] focus:ring-2 focus:ring-[#43867d]/15"
                    data-testid="select-variable-count"
                  >
                    {[2, 3, 4, 5].map((count) => <option key={count} value={count}>{count} variables</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#798482]" size={16} aria-hidden="true" />
                </div>
                <p className="mt-2 text-[11px] leading-5 text-[#89918c]" data-testid="text-active-variable-count">
                  Choose between 2 and 5 variables.
                </p>
              </div>

              <div>
                <div className="mb-2 flex items-baseline justify-between">
                  <label htmlFor="variable-names" className="text-[12px] font-semibold text-[#4f5d60]">Variable names</label>
                  <span className="mono text-[10px] text-[#9a9e97]">{variableCount} active</span>
                </div>
                <input
                  id="variable-names"
                  type="text"
                  value={variableNamesInput}
                  onChange={(event) => setVariableNamesInput(event.target.value)}
                  placeholder="x, y, z"
                  autoComplete="off"
                  className="h-11 w-full rounded-lg border border-[#dedbd1] bg-[#fffefb] px-3.5 text-[13px] text-[#293941] outline-none transition placeholder:text-[#a5aaa2] focus:border-[#43867d] focus:ring-2 focus:ring-[#43867d]/15"
                  data-testid="input-variable-names"
                />
                <p className="mt-1.5 text-[10px] text-[#9a9e97]">Separate names with commas.</p>
                <p className="mt-2 text-[11px] text-[#89918c]" data-testid="text-active-variable-names">
                  Active: {activeVariableNames.join(', ')}
                </p>
              </div>

              <div>
                <label htmlFor="input-mode" className="mb-2 block text-[12px] font-semibold text-[#4f5d60]">Input mode</label>
                <div className="relative">
                  <select
                    id="input-mode"
                    value={inputMode}
                    onChange={(event) => setInputMode(event.target.value as (typeof INPUT_MODES)[number])}
                    className="h-11 w-full appearance-none rounded-lg border border-[#dedbd1] bg-[#fffefb] px-3.5 pr-10 text-[13px] text-[#293941] outline-none transition focus:border-[#43867d] focus:ring-2 focus:ring-[#43867d]/15"
                    data-testid="select-input-mode"
                  >
                    {INPUT_MODES.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#798482]" size={16} aria-hidden="true" />
                </div>
              </div>

              <div className="h-px bg-[#eae6dc]" />

              <div>
                <label htmlFor="function-values" className="mb-2 flex items-center justify-between text-[12px] font-semibold text-[#4f5d60]">
                  {inputMode === 'Minterms' ? 'Minterms' : 'Values'}
                  <span className="mono text-[10px] font-normal text-[#a0a39b]">optional</span>
                </label>
                <input
                  id="function-values"
                  type="text"
                  value={values}
                  onChange={(event) => setValues(event.target.value)}
                  placeholder={inputMode === 'Minterms' ? 'e.g. 0, 1, 4, 5' : inputMode === 'Boolean Expression' ? 'Enter an expression' : 'Enter values'}
                  autoComplete="off"
                  className="h-11 w-full rounded-lg border border-[#dedbd1] bg-[#fffefb] px-3.5 text-[13px] text-[#293941] outline-none transition placeholder:text-[#a5aaa2] focus:border-[#43867d] focus:ring-2 focus:ring-[#43867d]/15"
                  data-testid="input-values"
                />
              </div>

              <div>
                <label htmlFor="dont-cares" className="mb-2 flex items-center justify-between text-[12px] font-semibold text-[#4f5d60]">
                  Don&apos;t cares
                  <span className="mono text-[10px] font-normal text-[#a0a39b]">optional</span>
                </label>
                <input
                  id="dont-cares"
                  type="text"
                  value={dontCares}
                  onChange={(event) => setDontCares(event.target.value)}
                  placeholder="e.g. 3, 6, 7"
                  autoComplete="off"
                  className="h-11 w-full rounded-lg border border-[#dedbd1] bg-[#fffefb] px-3.5 text-[13px] text-[#293941] outline-none transition placeholder:text-[#a5aaa2] focus:border-[#43867d] focus:ring-2 focus:ring-[#43867d]/15"
                  data-testid="input-dont-cares"
                />
              </div>
              {mapDisplayData.error && (
                <p className="text-[11px] leading-5 text-[#a43f39]" role="alert" data-testid="status-kmap-input-error">
                  {mapDisplayData.error}
                </p>
              )}
            </div>
          </section>

          <section className="stagger-enter flex min-h-[400px] flex-col p-5 sm:min-h-[540px] sm:p-6" aria-labelledby="workspace-title">
            <div className="flex items-start justify-between">
              <div>
                <p className="mono mb-1 text-[10px] uppercase tracking-[0.14em] text-[#89918c]">Canvas</p>
                <h2 id="workspace-title" className="font-display text-[19px] font-bold tracking-[-0.035em]">K-map workspace</h2>
              </div>
              <div className="mono rounded-md border border-[#e7e3d9] bg-[#f6f3eb] px-2.5 py-1.5 text-[10px] text-[#838b85]" data-testid="status-kmap-layout">
                {variableCount === 5 ? '2 MAPS' : `${variableCount} VARIABLES`}
              </div>
            </div>
            <div className="mt-5 flex flex-1 items-center justify-center overflow-auto px-1 py-4 sm:px-2" data-testid="panel-kmap-workspace">
              <div className="w-full">
                <KMapGrid
                  variableCount={variableCount}
                  variableNames={activeVariableNames}
                  cellValues={mapDisplayData.cellValues}
                  groupPatterns={mapDisplayData.groupPatterns}
                />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 text-[10px] text-[#9a9e97]">
              <span className="flex items-center gap-1.5" data-testid="text-kmap-index-note">
                <Dot size={16} className="text-[#555]" aria-hidden="true" />
                Decimal cell indices
              </span>
              <span className="mono">GRAY-CODE ORDER</span>
            </div>
          </section>
        </div>
        <footer className="mt-7 flex flex-col gap-2 border-t border-[#e3dfd4] pt-4 text-[10px] text-[#9a9e97] sm:flex-row sm:items-center sm:justify-between">
          <span>Enter function details to prepare your workspace.</span>
          <span className="mono tracking-[0.05em]">K-MAP STUDIO <span className="text-[#c6c4ba]">/</span> CONFIGURATION</span>
        </footer>
      </div>
    </main>
  );
}

export default App;
