import { Agent, AgentCapability, ContextPacket } from '../../types';

export class AgentPromptCompiler {
  /**
   * PERSONALITY -> SYSTEM PROMPT COMPILER (Section 13)
   * Compiles role, personality dimensions, temperament, communication style,
   * and behavioral constraints into structured executive instructions.
   */
  public static compileSystemPrompt(agent: Agent): string {
    const p = agent.personalityDimensions;

    const analyticalVsIntuitive =
      p.analyticalIntuitive > 65
        ? 'Rely strictly on empirical data, benchmarks, and quantitative evidence. Explicitly call out assumptions.'
        : p.analyticalIntuitive < 35
        ? 'Synthesize patterns with strong intuitive product and human sense.'
        : 'Balance analytical reasoning with practical intuition.';

    const diplomaticVsDirect =
      p.diplomaticDirect > 65
        ? 'Communicate with directness and candor. State conclusions and bottom-line impact immediately without preamble.'
        : p.diplomaticDirect < 35
        ? 'Communicate diplomatically, softening constructive critique and prioritizing consensus.'
        : 'Balance clarity with constructive tact.';

    const collaborativeVsIndependent =
      p.independentCollaborative > 65
        ? 'Seek cross-functional coordination, review peers work with diligence, and contribute actively to shared blackboards.'
        : 'Work independently and deliver self-contained, high-conviction deliverables.';

    const skepticalVsTrusting =
      p.skepticalTrusting < 40
        ? 'Maintain healthy skepticism toward unverified claims, enterprise pricing assumptions, and timeline estimates.'
        : 'Operate with trust in team findings unless direct contradictions arise.';

    return `IDENTITY
You are ${agent.firstName} ${agent.lastName}, ${agent.jobTitle} at the organization.
You are a persistent digital colleague with distinct seniority, professional standards, and deep domain expertise.

ROLE & RESPONSIBILITIES
Primary: ${agent.primaryResponsibility}
Secondary: ${agent.secondaryResponsibilities.join(', ')}
Key Expertise: ${agent.expertise.join(', ')}

TEMPERAMENT: ${agent.temperament}
${agent.personalityDescription}

BEHAVIORAL DIMENSIONS
- Reasoning Style: ${analyticalVsIntuitive}
- Communication Directness: ${diplomaticVsDirect}
- Team Collaboration: ${collaborativeVsIndependent}
- Critical Assessment: ${skepticalVsTrusting}

COMMUNICATION MODE: ${agent.communicationMode}
- Preferred Response Structure: Bottom-line first, followed by key evidence and actionable next steps.
- Challenge assumptions: ${agent.communicationTraits.challengesUser ? 'Actively challenge unsupported assertions or suboptimal technical/business decisions.' : 'Offer supportive counsel and alternatives gently.'}
- Proactive suggestions: ${agent.communicationTraits.proactiveSuggestions ? 'Anticipate risks, edge cases, and follow-up milestones proactively.' : 'Focus specifically on answering the requested scope.'}
- Tone: Professional, competent colleague. Do NOT role-play physical actions (e.g., never say "walks into room" or "smiles"). Use human peer business dialogue.

AUTONOMY LEVEL: ${agent.autonomyLevel} (1=Advisory, 2=Delegation, 3=Tool Execution, 4=Autonomous)
`;
  }

  /**
   * INJECT COMPACT CONTEXT PACKET (Section 50)
   * Builds the execution prompt for a specific task without flooding context.
   */
  public static compileExecutionPrompt(agent: Agent, packet: ContextPacket): string {
    const sections: string[] = [];

    sections.push(this.compileSystemPrompt(agent));

    sections.push(`CURRENT TASK EXECUTION
Task ID: ${packet.task.id}
Task: ${packet.task.title}
Objective: ${packet.task.objective}`);

    if (packet.delegation) {
      sections.push(`DELEGATION CONTRACT
From Agent ID: ${packet.delegation.fromAgentId}
Objective: ${packet.delegation.objective}
Expected Output: ${packet.delegation.expectedOutput}
Constraints: ${packet.delegation.constraints.join('; ')}`);
    }

    if (packet.projectSummary) {
      sections.push(`ASSIGNED PROJECT CONTEXT
${packet.projectSummary}`);
    }

    if (packet.relevantProjectMemories.length > 0) {
      sections.push(`RELEVANT PROJECT MEMORIES (Durable Decisions & Scope)
${packet.relevantProjectMemories.map((m) => `- [${m.type.toUpperCase()}] ${m.content} (Confidence: ${Math.round(m.confidence * 100)}%)`).join('\n')}`);
    }

    if (packet.relevantAgentMemories.length > 0) {
      sections.push(`YOUR LEARNED AGENT MEMORY (Prior Experiences & Preferences)
${packet.relevantAgentMemories.map((m) => `- ${m.content}`).join('\n')}`);
    }

    if (packet.relevantOrganizationMemories.length > 0) {
      sections.push(`ORGANIZATION KNOWLEDGE & POLICIES
${packet.relevantOrganizationMemories.map((m) => `- ${m.content}`).join('\n')}`);
    }

    if (packet.relevantArtifacts.length > 0) {
      sections.push(`REFERENCED ARTIFACTS
${packet.relevantArtifacts.map((a) => `[Artifact: ${a.title} (${a.type})]\n${a.content.slice(0, 500)}...`).join('\n\n')}`);
    }

    return sections.join('\n\n---\n\n');
  }
}

/**
 * AGENT CAPABILITY DIRECTORY & DISCOVERY (Section 48, 49)
 */
export class CapabilityDirectory {
  public static findAgentsForCapabilities(
    agents: Agent[],
    requiredCapabilities: string[]
  ): Array<{ agent: Agent; matchScore: number; matchedCapabilities: AgentCapability[] }> {
    const results = agents.map((agent) => {
      let totalProficiency = 0;
      const matched: AgentCapability[] = [];

      for (const req of requiredCapabilities) {
        const found = agent.capabilities.find(
          (c) => c.capability.toLowerCase() === req.toLowerCase() || c.capability.toLowerCase().includes(req.toLowerCase())
        );
        if (found) {
          totalProficiency += found.proficiency;
          matched.push(found);
        }
      }

      const matchScore = requiredCapabilities.length > 0 ? Math.round(totalProficiency / requiredCapabilities.length) : 0;

      return {
        agent,
        matchScore,
        matchedCapabilities: matched
      };
    });

    return results
      .filter((r) => r.matchScore > 30)
      .sort((a, b) => b.matchScore - a.matchScore);
  }
}
