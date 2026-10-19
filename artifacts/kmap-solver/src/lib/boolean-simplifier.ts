const DEFAULT_VARIABLE_NAMES = ['A', 'B', 'C', 'D', 'E'] as const;

export type BooleanSimplifierInput = {
  variableCount: number;
  minterms: readonly number[];
  dontCares?: readonly number[];
  variableNames?: readonly string[];
};

export type PrimeImplicant = {
  /** A 0/1/- pattern in variable order; "-" means the variable is eliminated. */
  pattern: string;
  /** Product term using ' for NOT, · for AND, and + between terms for OR. */
  expression: string;
  literalCount: number;
  coveredMinterms: number[];
};

export type BooleanSimplificationResult = {
  /** The minimum sum-of-products expression, using the supplied variable names. */
  expression: string;
  /** All prime implicants that cover at least one required minterm. */
  primeImplicants: PrimeImplicant[];
  /** Prime implicants that are the only cover for at least one required minterm. */
  essentialPrimeImplicants: PrimeImplicant[];
  /** A minimum-cost cover of the required minterms, including all essentials. */
  selectedPrimeImplicants: PrimeImplicant[];
};

function normalizeTerms(terms: readonly number[], label: string, maxMinterm: number): number[] {
  if (!Array.isArray(terms)) {
    throw new TypeError(`${label} must be an array of integers.`);
  }

  const normalized = new Set<number>();
  for (const term of terms) {
    if (!Number.isInteger(term)) {
      throw new TypeError(`${label} must contain only integers.`);
    }
    if (term < 0 || term > maxMinterm) {
      throw new RangeError(`${label} must be between 0 and ${maxMinterm}.`);
    }
    normalized.add(term);
  }

  return [...normalized].sort((left, right) => left - right);
}

function normalizeVariableNames(variableNames: readonly string[] | undefined, variableCount: number): string[] {
  if (variableNames !== undefined && !Array.isArray(variableNames)) {
    throw new TypeError('variableNames must be an array of identifiers.');
  }

  const names = variableNames === undefined
    ? DEFAULT_VARIABLE_NAMES.slice(0, variableCount)
    : variableNames.map((name) => {
        if (typeof name !== 'string') {
          throw new TypeError('Variable names must be strings.');
        }
        return name.trim();
      });

  if (names.length !== variableCount) {
    throw new RangeError(`Provide exactly ${variableCount} variable names.`);
  }

  for (const name of names) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
      throw new TypeError(`"${name}" is not a valid variable identifier.`);
    }
  }

  if (new Set(names.map((name) => name.toLowerCase())).size !== names.length) {
    throw new TypeError('Variable names must be unique.');
  }

  return names;
}

function toBits(minterm: number, variableCount: number): string {
  return minterm.toString(2).padStart(variableCount, '0');
}

function combinePatterns(left: string, right: string): string | null {
  let differenceIndex = -1;

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] === right[index]) {
      continue;
    }
    if (left[index] === '-' || right[index] === '-' || differenceIndex !== -1) {
      return null;
    }
    differenceIndex = index;
  }

  if (differenceIndex === -1) {
    return null;
  }

  return `${left.slice(0, differenceIndex)}-${left.slice(differenceIndex + 1)}`;
}

function patternCoversMinterm(pattern: string, minterm: number, variableCount: number): boolean {
  const bits = toBits(minterm, variableCount);
  return [...pattern].every((bit, index) => bit === '-' || bit === bits[index]);
}

function expressionForPattern(pattern: string, variableNames: readonly string[]): string {
  const literals = [...pattern].flatMap((bit, index) => {
    if (bit === '-') {
      return [];
    }
    return [bit === '1' ? variableNames[index] : `${variableNames[index]}'`];
  });

  return literals.length === 0 ? '1' : literals.join('·');
}

function countSetBits(value: bigint): number {
  let remaining = value;
  let count = 0;

  while (remaining !== 0n) {
    remaining &= remaining - 1n;
    count += 1;
  }

  return count;
}

function mintermMask(minterms: readonly number[]): bigint {
  return minterms.reduce((mask, minterm) => mask | (1n << BigInt(minterm)), 0n);
}

/**
 * Simplifies a Boolean function with Quine–McCluskey and an exact prime-implicant
 * cover search. It minimizes term count first, then literal count.
 */
export function simplifyBooleanFunction({
  variableCount,
  minterms,
  dontCares = [],
  variableNames,
}: BooleanSimplifierInput): BooleanSimplificationResult {
  if (!Number.isInteger(variableCount) || variableCount < 1 || variableCount > 5) {
    throw new RangeError('variableCount must be an integer between 1 and 5.');
  }

  const maxMinterm = (1 << variableCount) - 1;
  const normalizedMinterms = normalizeTerms(minterms, 'minterms', maxMinterm);
  const normalizedDontCares = normalizeTerms(dontCares, 'dontCares', maxMinterm);
  const mintermSet = new Set(normalizedMinterms);
  if (normalizedDontCares.some((term) => mintermSet.has(term))) {
    throw new RangeError('A minterm cannot also be listed as a don’t-care.');
  }

  const names = normalizeVariableNames(variableNames, variableCount);
  let currentPatterns = [...new Set([...normalizedMinterms, ...normalizedDontCares])]
    .map((term) => toBits(term, variableCount));
  const primePatterns = new Set<string>();

  while (currentPatterns.length > 0) {
    const combinedPatterns = new Set<string>();
    const combinedThisRound = new Set<string>();

    for (let leftIndex = 0; leftIndex < currentPatterns.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < currentPatterns.length; rightIndex += 1) {
        const combined = combinePatterns(currentPatterns[leftIndex], currentPatterns[rightIndex]);
        if (combined !== null) {
          combinedThisRound.add(currentPatterns[leftIndex]);
          combinedThisRound.add(currentPatterns[rightIndex]);
          combinedPatterns.add(combined);
        }
      }
    }

    for (const pattern of currentPatterns) {
      if (!combinedThisRound.has(pattern)) {
        primePatterns.add(pattern);
      }
    }

    currentPatterns = [...combinedPatterns];
  }

  const primeImplicants: PrimeImplicant[] = [...primePatterns]
    .filter((pattern) => normalizedMinterms.some((term) => patternCoversMinterm(pattern, term, variableCount)))
    .sort()
    .map((pattern) => ({
      pattern,
      expression: expressionForPattern(pattern, names),
      literalCount: [...pattern].filter((bit) => bit !== '-').length,
      coveredMinterms: normalizedMinterms.filter((term) =>
        patternCoversMinterm(pattern, term, variableCount),
      ),
    }));

  const essentialPatterns = new Set<string>();
  for (const minterm of normalizedMinterms) {
    const coveringImplicants = primeImplicants.filter((implicant) =>
      implicant.coveredMinterms.includes(minterm),
    );
    if (coveringImplicants.length === 1) {
      essentialPatterns.add(coveringImplicants[0].pattern);
    }
  }

  const essentialPrimeImplicants = primeImplicants.filter((implicant) =>
    essentialPatterns.has(implicant.pattern),
  );
  const targetMask = mintermMask(normalizedMinterms);
  const essentialMask = mintermMask(
    essentialPrimeImplicants.flatMap((implicant) => implicant.coveredMinterms),
  );
  const candidates = primeImplicants.filter((implicant) => !essentialPatterns.has(implicant.pattern));
  const candidateMasks = candidates.map((implicant) => mintermMask(implicant.coveredMinterms));

  let bestCandidateIndexes: number[] | null = targetMask === essentialMask ? [] : null;
  let bestLiteralCount = Number.POSITIVE_INFINITY;

  function searchCover(coveredMask: bigint, chosenIndexes: number[]) {
    if ((coveredMask & targetMask) === targetMask) {
      const literalCount = chosenIndexes.reduce(
        (total, index) => total + candidates[index].literalCount,
        0,
      );
      const candidateKey = chosenIndexes.map((index) => candidates[index].pattern).sort().join('|');
      const bestKey = bestCandidateIndexes
        ?.map((index) => candidates[index].pattern)
        .sort()
        .join('|');

      if (
        bestCandidateIndexes === null ||
        chosenIndexes.length < bestCandidateIndexes.length ||
        (chosenIndexes.length === bestCandidateIndexes.length && literalCount < bestLiteralCount) ||
        (chosenIndexes.length === bestCandidateIndexes.length && literalCount === bestLiteralCount && candidateKey < (bestKey ?? ''))
      ) {
        bestCandidateIndexes = [...chosenIndexes];
        bestLiteralCount = literalCount;
      }
      return;
    }

    if (bestCandidateIndexes !== null && chosenIndexes.length >= bestCandidateIndexes.length) {
      return;
    }

    let nextMinterm: number | undefined;
    let nextChoices: number[] = [];

    for (const minterm of normalizedMinterms) {
      const bit = 1n << BigInt(minterm);
      if ((coveredMask & bit) !== 0n) {
        continue;
      }

      const choices = candidates
        .map((_, index) => index)
        .filter((index) => (candidateMasks[index] & bit) !== 0n);

      if (choices.length === 0) {
        return;
      }
      if (nextMinterm === undefined || choices.length < nextChoices.length) {
        nextMinterm = minterm;
        nextChoices = choices;
      }
    }

    if (nextMinterm === undefined) {
      return;
    }

    const uncoveredMask = targetMask ^ coveredMask;
    nextChoices.sort((leftIndex, rightIndex) => {
      const newCoverageDifference =
        countSetBits(candidateMasks[rightIndex] & uncoveredMask) -
        countSetBits(candidateMasks[leftIndex] & uncoveredMask);
      return newCoverageDifference ||
        candidates[leftIndex].literalCount - candidates[rightIndex].literalCount ||
        candidates[leftIndex].pattern.localeCompare(candidates[rightIndex].pattern);
    });

    for (const candidateIndex of nextChoices) {
      const nextMask = coveredMask | candidateMasks[candidateIndex];
      if (nextMask === coveredMask) {
        continue;
      }
      chosenIndexes.push(candidateIndex);
      searchCover(nextMask, chosenIndexes);
      chosenIndexes.pop();
    }
  }

  if (bestCandidateIndexes === null) {
    searchCover(essentialMask, []);
  }

  if (bestCandidateIndexes === null) {
    throw new Error('Unable to cover all minterms with the generated prime implicants.');
  }

  const selectedPrimeImplicants = [
    ...essentialPrimeImplicants,
    ...bestCandidateIndexes.map((index) => candidates[index]),
  ].sort((left, right) => left.pattern.localeCompare(right.pattern));
  const expression = selectedPrimeImplicants.length === 0
    ? '0'
    : selectedPrimeImplicants.some((implicant) => implicant.expression === '1')
      ? '1'
      : selectedPrimeImplicants.map((implicant) => implicant.expression).join(' + ');

  return {
    expression,
    primeImplicants,
    essentialPrimeImplicants,
    selectedPrimeImplicants,
  };
}
