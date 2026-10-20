import { Fragment } from 'react';
import { splitVariableName } from '../lib/variable-format';

export function FormatVariable({ name }: { name: string }) {
  const { base, subscript } = splitVariableName(name);

  return (
    <>
      {base}
      {subscript !== null && <sub className="text-[0.7em] leading-none">{subscript}</sub>}
    </>
  );
}

export function FormatVariableList({ names }: { names: string[] }) {
  return (
    <>
      {names.map((name, index) => (
        <Fragment key={`${name}-${index}`}>
          {index > 0 && ', '}
          <FormatVariable name={name} />
        </Fragment>
      ))}
    </>
  );
}

export function FormatBooleanExpression({ expression }: { expression: string }) {
  const parts = expression.split(/([A-Za-z_][A-Za-z0-9_]*)/g);

  return (
    <>
      {parts.map((part, index) => (
        /^[A-Za-z_][A-Za-z0-9_]*$/.test(part)
          ? <FormatVariable key={`${part}-${index}`} name={part} />
          : <span key={`text-${index}`}>{part}</span>
      ))}
    </>
  );
}
