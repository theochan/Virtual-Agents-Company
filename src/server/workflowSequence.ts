// Each occurrence is a separate operation. A receipt can complete only one step.
// Older persisted unique-tool sequences remain readable without rewriting history.
export function nextWorkflowStep(sequence: string[] = [], receipts: Array<Record<string, any>> = []) {
  let index = 0;
  const legacy = new Set(sequence).size === sequence.length;
  for (const receipt of receipts) {
    if (index === sequence.length) break;
    if (receipt.status !== 'succeeded' || receipt.toolId !== sequence[index]) continue;
    if (receipt.sequenceStep === index || (legacy && receipt.sequenceStep === undefined)) index++;
  }
  return index < sequence.length ? {index, toolId: sequence[index]} : undefined;
}

// Tool argument object-key ordering is not a new operation.
export function canonicalWorkflowArguments(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalWorkflowArguments);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,canonicalWorkflowArguments(v)]));
  return value;
}
