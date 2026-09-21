type Step = { key: string; parentKey?: string; dependsOn: string[] };

// A supervisor completes only after its children. Include these implicit waits
// when validating explicit dependencies, including those across tree branches.
export function validateWorkflowTopology(steps: Step[]) {
  const byKey = new Map(steps.map(step => [step.key, step]));
  if (byKey.size !== steps.length) throw new Error('Plan keys must be unique');
  const children = new Map<string, string[]>();
  for (const step of steps) {
    if (step.parentKey) {
      if (!byKey.has(step.parentKey)) throw new Error('Plan parent missing: ' + step.parentKey);
      children.set(step.parentKey, [...(children.get(step.parentKey) || []), step.key]);
    }
    for (const dependency of step.dependsOn) {
      if (!byKey.has(dependency)) throw new Error(`${step.key}: dependency ${dependency} is not a plan key`);
      if (dependency === step.key) throw new Error(`${step.key}: self dependency rejected`);
    }
  }
  for (const step of steps) {
    if (children.has(step.key) && step.dependsOn.length) {
      throw new Error(`${step.key}: supervisor cannot have dependsOn; put prerequisites on its leaf workers`);
    }
  }
  const visited = new Set<string>();
  const active: string[] = [];
  const visit = (key: string) => {
    if (active.includes(key)) throw new Error('Plan completion dependency cycle rejected: ' + [...active.slice(active.indexOf(key)), key].join(' -> '));
    if (visited.has(key)) return;
    active.push(key);
    for (const next of [...byKey.get(key)!.dependsOn, ...(children.get(key) || [])]) visit(next);
    active.pop();
    visited.add(key);
  };
  for (const step of steps) visit(step.key);
}
