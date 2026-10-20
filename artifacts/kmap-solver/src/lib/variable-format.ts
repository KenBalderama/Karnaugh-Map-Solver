export type ParsedVariableName = {
  base: string;
  subscript: string | null;
};

export function splitVariableName(name: string): ParsedVariableName {
  const match = name.match(/^(.+?)(?:_?(\d+))$/);
  if (!match) {
    return { base: name, subscript: null };
  }

  return { base: match[1], subscript: match[2] };
}
