import assert from 'node:assert/strict';
import { test } from 'node:test';
import { simplifyBooleanFunction, simplifyBooleanFunctionForms } from '../src/lib/boolean-simplifier.ts';

function patternCovers(pattern, minterm, variableCount) {
  const bits = minterm.toString(2).padStart(variableCount, '0');
  return [...pattern].every((bit, index) => bit === '-' || bit === bits[index]);
}

function evaluateExpression(expression, variableNames, minterm, variableCount) {
  if (expression === '0') return false;
  if (expression === '1') return true;

  const bits = minterm.toString(2).padStart(variableCount, '0');
  return expression.split(' + ').some((term) =>
    term.split('·').every((literal) => {
      const negated = literal.endsWith("'");
      const name = negated ? literal.slice(0, -1) : literal;
      const variableIndex = variableNames.indexOf(name);
      assert.notEqual(variableIndex, -1, `Unexpected literal ${literal}`);
      return negated ? bits[variableIndex] === '0' : bits[variableIndex] === '1';
    }),
  );
}

function evaluateProductOfSums(expression, variableNames, minterm, variableCount) {
  if (expression === '0') return false;
  if (expression === '1') return true;

  const bits = minterm.toString(2).padStart(variableCount, '0');
  const clauses = [...expression.matchAll(/\(([^()]*)\)/g)].map(([, clause]) => clause);
  assert.ok(clauses.length > 0, `Expected parenthesized POS clauses in ${expression}`);
  return clauses.every((clause) =>
    clause.split(' + ').some((literal) => {
      const negated = literal.endsWith("'");
      const name = negated ? literal.slice(0, -1) : literal;
      const variableIndex = variableNames.indexOf(name);
      assert.notEqual(variableIndex, -1, `Unexpected literal ${literal}`);
      return negated ? bits[variableIndex] === '0' : bits[variableIndex] === '1';
    }),
  );
}

function countBits(value) {
  let count = 0;
  for (let remaining = value; remaining > 0; remaining &= remaining - 1) count += 1;
  return count;
}

function literalCost(implicants) {
  return implicants.reduce((total, implicant) => total + implicant.literalCount, 0);
}

test('simplifies a three-variable function and identifies its essential prime implicant', () => {
  const result = simplifyBooleanFunction({
    variableCount: 3,
    minterms: [1, 3, 5, 7],
  });

  assert.equal(result.expression, 'C');
  assert.deepEqual(result.essentialPrimeImplicants.map(({ pattern }) => pattern), ['--1']);
  assert.deepEqual(result.selectedPrimeImplicants.map(({ pattern }) => pattern), ['--1']);
});

test('uses don’t-care terms to expand implicants without requiring them to be true', () => {
  const result = simplifyBooleanFunction({
    variableCount: 3,
    minterms: [1, 3, 5],
    dontCares: [7],
  });

  assert.equal(result.expression, 'C');
  assert.deepEqual(result.essentialPrimeImplicants.map(({ pattern }) => pattern), ['--1']);
  assert.deepEqual(result.essentialPrimeImplicants[0].coveredMinterms, [1, 3, 5]);
});

test('finds a minimum cover when no prime implicant is essential', () => {
  const minterms = [0, 1, 3, 4, 6, 7];
  const result = simplifyBooleanFunction({ variableCount: 4, minterms });

  assert.equal(result.essentialPrimeImplicants.length, 0);
  assert.equal(result.selectedPrimeImplicants.length, 3);
  for (let minterm = 0; minterm < 16; minterm += 1) {
    const covered = result.selectedPrimeImplicants.some((implicant) =>
      patternCovers(implicant.pattern, minterm, 4),
    );
    assert.equal(covered, minterms.includes(minterm), `Minterm ${minterm}`);
  }
});

test('supports five variables and custom variable names', () => {
  const minterms = Array.from({ length: 16 }, (_, index) => index * 2 + 1);
  const result = simplifyBooleanFunction({
    variableCount: 5,
    minterms,
    variableNames: ['p', 'q', 'r', 's', 't'],
  });

  assert.equal(result.expression, 't');
  assert.deepEqual(result.essentialPrimeImplicants.map(({ pattern }) => pattern), ['----1']);
});

test('preserves a five-variable function across its full truth table with don’t-cares', () => {
  const variableCount = 5;
  const variableNames = ['A', 'B', 'C', 'D', 'E'];
  const dontCares = [0, 6, 8, 24];
  const minterms = [];

  for (let minterm = 0; minterm < 1 << variableCount; minterm += 1) {
    if (dontCares.includes(minterm)) continue;
    const [a, b, c, d, e] = minterm.toString(2).padStart(variableCount, '0');
    if ((a === '0' && b === '1') || (c === '1' && d === '0') || e === '1') {
      minterms.push(minterm);
    }
  }

  const result = simplifyBooleanFunction({
    variableCount,
    minterms,
    dontCares,
    variableNames,
  });

  for (let minterm = 0; minterm < 1 << variableCount; minterm += 1) {
    if (dontCares.includes(minterm)) continue;
    const [a, b, c, d, e] = minterm.toString(2).padStart(variableCount, '0');
    const expected = (a === '0' && b === '1') || (c === '1' && d === '0') || e === '1';
    assert.equal(
      evaluateExpression(result.expression, variableNames, minterm, variableCount),
      expected,
      `Minterm ${minterm}, expression ${result.expression}`,
    );
  }
});

test('returns the constant expressions for empty and full on-sets', () => {
  assert.equal(simplifyBooleanFunction({ variableCount: 3, minterms: [] }).expression, '0');
  assert.equal(
    simplifyBooleanFunction({ variableCount: 3, minterms: [0, 1, 2, 3, 4, 5, 6, 7] }).expression,
    '1',
  );
});

test('formats POS clauses with complemented literals and custom names', () => {
  const forms = simplifyBooleanFunctionForms({
    variableCount: 2,
    minterms: [3],
    variableNames: ['x', 'y'],
  });

  assert.equal(forms.sop.expression, 'x·y');
  assert.deepEqual(
    [...forms.pos.expression.matchAll(/\(([^()]*)\)/g)].map(([, clause]) => clause).sort(),
    ['x', 'y'],
  );
  assert.equal(
    simplifyBooleanFunctionForms({ variableCount: 2, minterms: [] }).pos.expression,
    '0',
  );
  assert.equal(
    simplifyBooleanFunctionForms({ variableCount: 2, minterms: [0, 1, 2, 3] }).pos.expression,
    '1',
  );
});

test('POS matches every three-variable truth table and respects don’t-cares', () => {
  const variableCount = 3;
  const variableNames = ['x', 'y', 'z'];
  const mintermLimit = 1 << variableCount;

  for (let truthTable = 0; truthTable < (1 << mintermLimit); truthTable += 1) {
    const minterms = Array.from({ length: mintermLimit }, (_, minterm) => minterm)
      .filter((minterm) => (truthTable & (1 << minterm)) !== 0);
    const { pos } = simplifyBooleanFunctionForms({ variableCount, minterms, variableNames });

    for (let minterm = 0; minterm < mintermLimit; minterm += 1) {
      assert.equal(
        evaluateProductOfSums(pos.expression, variableNames, minterm, variableCount),
        minterms.includes(minterm),
        `Truth table ${truthTable}, minterm ${minterm}, POS ${pos.expression}`,
      );
    }
  }

  const withDontCares = simplifyBooleanFunctionForms({
    variableCount,
    minterms: [0, 1, 2, 3],
    dontCares: [4],
    variableNames,
  });
  for (const minterm of [0, 1, 2, 3, 5, 6, 7]) {
    assert.equal(
      evaluateProductOfSums(withDontCares.pos.expression, variableNames, minterm, variableCount),
      minterm < 4,
      `Minterm ${minterm}, POS ${withDontCares.pos.expression}`,
    );
  }
});

test('supports five-variable POS with custom names and don’t-cares', () => {
  const variableCount = 5;
  const variableNames = ['p', 'q', 'r', 's', 't'];
  const dontCares = [0, 6];
  const minterms = Array.from({ length: 1 << variableCount }, (_, minterm) => minterm)
    .filter((minterm) => minterm % 2 === 1);
  const { pos } = simplifyBooleanFunctionForms({
    variableCount,
    minterms,
    dontCares,
    variableNames,
  });

  assert.equal(pos.expression, '(t)');
  for (let minterm = 0; minterm < 1 << variableCount; minterm += 1) {
    if (dontCares.includes(minterm)) continue;
    assert.equal(
      evaluateProductOfSums(pos.expression, variableNames, minterm, variableCount),
      minterm % 2 === 1,
      `Minterm ${minterm}, POS ${pos.expression}`,
    );
  }
});

test('deduplicates repeated terms and validates term ranges and variable names', () => {
  const duplicateInput = simplifyBooleanFunction({
    variableCount: 2,
    minterms: [1, 1, 3],
  });
  assert.equal(duplicateInput.expression, 'B');

  assert.throws(
    () => simplifyBooleanFunction({ variableCount: 6, minterms: [0] }),
    /between 1 and 5/,
  );
  assert.throws(
    () => simplifyBooleanFunction({ variableCount: 3, minterms: [8] }),
    /between 0 and 7/,
  );
  assert.throws(
    () => simplifyBooleanFunction({ variableCount: 3, minterms: [1], dontCares: [1] }),
    /cannot also be listed/,
  );
  assert.throws(
    () => simplifyBooleanFunction({ variableCount: 2, minterms: [1], variableNames: ['A', 'a'] }),
    /must be unique/,
  );
});

test('matches every three-variable truth table and returns a minimum-term, minimum-literal cover', () => {
  const variableCount = 3;
  const variableNames = ['A', 'B', 'C'];
  const mintermLimit = 1 << variableCount;

  for (let truthTable = 0; truthTable < (1 << mintermLimit); truthTable += 1) {
    const minterms = Array.from({ length: mintermLimit }, (_, minterm) => minterm)
      .filter((minterm) => (truthTable & (1 << minterm)) !== 0);
    const result = simplifyBooleanFunction({ variableCount, minterms, variableNames });

    for (let minterm = 0; minterm < mintermLimit; minterm += 1) {
      assert.equal(
        evaluateExpression(result.expression, variableNames, minterm, variableCount),
        minterms.includes(minterm),
        `Truth table ${truthTable}, minterm ${minterm}, expression ${result.expression}`,
      );
    }

    for (const minterm of minterms) {
      const coveringImplicants = result.primeImplicants.filter(({ pattern }) =>
        patternCovers(pattern, minterm, variableCount),
      );
      if (coveringImplicants.length === 1) {
        assert.ok(
          result.essentialPrimeImplicants.some(({ pattern }) => pattern === coveringImplicants[0].pattern),
          `Truth table ${truthTable}, essential minterm ${minterm}`,
        );
      }
    }

    const expectedEssentialPatterns = result.primeImplicants
      .filter((implicant) => implicant.coveredMinterms.some((minterm) =>
        result.primeImplicants.filter((candidate) => candidate.coveredMinterms.includes(minterm)).length === 1,
      ))
      .map(({ pattern }) => pattern)
      .sort();
    assert.deepEqual(
      result.essentialPrimeImplicants.map(({ pattern }) => pattern).sort(),
      expectedEssentialPatterns,
      `Truth table ${truthTable}`,
    );

    let bestTermCount = Number.POSITIVE_INFINITY;
    let bestLiteralCount = Number.POSITIVE_INFINITY;
    const primeCount = result.primeImplicants.length;
    for (let subset = 0; subset < (1 << primeCount); subset += 1) {
      const implicants = result.primeImplicants.filter((_, index) => (subset & (1 << index)) !== 0);
      const coversAllMinterms = minterms.every((minterm) =>
        implicants.some(({ pattern }) => patternCovers(pattern, minterm, variableCount)),
      );
      if (!coversAllMinterms) continue;

      const termCount = countBits(subset);
      const termLiterals = literalCost(implicants);
      if (
        termCount < bestTermCount ||
        (termCount === bestTermCount && termLiterals < bestLiteralCount)
      ) {
        bestTermCount = termCount;
        bestLiteralCount = termLiterals;
      }
    }

    assert.equal(result.selectedPrimeImplicants.length, bestTermCount, `Truth table ${truthTable}`);
    assert.equal(literalCost(result.selectedPrimeImplicants), bestLiteralCount, `Truth table ${truthTable}`);
    for (const essential of result.essentialPrimeImplicants) {
      assert.ok(result.selectedPrimeImplicants.some(({ pattern }) => pattern === essential.pattern));
    }
  }
});
