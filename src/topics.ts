import { NoteItem, TopicCluster } from './types';

export const DEFAULT_TOPIC_RULES = [
  {
    id: 'ai-payments',
    title: 'AI, Tollbooths & Payments',
    keywords: ['stripe', 'tolls', 'tollbooth', 'payments', 'tokens', 'openrouter', 'routing', 'buy of openrouter'],
    postIdeaTemplates: [
      'Analyze the evolution of AI token economics and payment infrastructure over the past quarter.',
      'How AI routing layers capture more value than raw model providers.',
      'Tollbooth business models for autonomous AI agent ecosystems.'
    ]
  },
  {
    id: 'economy-forex',
    title: 'Global Economy & Forex (Yen / USD)',
    keywords: ['economy', 'yen', 'usdollar', 'japan', 'ltcm', 'genius', 'market', 'import from japan'],
    postIdeaTemplates: [
      'Comparing modern currency carry-trades to historical LTCM crises.',
      'Why liquidity bottlenecks in global currency markets impact tech capital flows.'
    ]
  },
  {
    id: 'startups-growth',
    title: 'Startup Horizons & Early Execution',
    keywords: ['startups', 'startup', 'horizons', 'building', 'founder', 'energy', 'excitement', 'earnings', 'prospect'],
    postIdeaTemplates: [
      'Managing T1 (Vision), T2 (Quarterly), and T3 (Daily) time horizons as a founder.',
      'The 4 Es of early-stage startups: Energy, Excitement, Expectations vs. Earnings.',
      'Why building one unrequested project every year accelerates personal growth.'
    ]
  },
  {
    id: 'systems-infrastructure',
    title: 'Systems Engineering & Compute Bottlenecks',
    keywords: ['servers', 'capacity', 'bottlenecks', 'network', 'compute', 'systems', 'plumbers', 'electricians'],
    postIdeaTemplates: [
      'Why 1000x compute gains always lead to novel system bottlenecks.',
      'High-demand infrastructure roles in the AI-dominated server era.'
    ]
  },
  {
    id: 'software-evolution',
    title: 'Evolution of Software Engineering',
    keywords: ['software', 'lint', 'prompt', 'code', 'developer', 'linting', 'models'],
    postIdeaTemplates: [
      'From lint failures (2000s) to prompt failures (2020s): What is the next software paradigm?',
      'How developer workflows adapt when code generation becomes ambient.'
    ]
  }
];

export function buildTopicClusters(notes: NoteItem[]): TopicCluster[] {
  const clustersMap = new Map<string, TopicCluster>();

  // Initialize rules-based clusters
  DEFAULT_TOPIC_RULES.forEach(rule => {
    clustersMap.set(rule.id, {
      id: rule.id,
      title: rule.title,
      keywords: rule.keywords,
      note_ids: [],
      future_post_ideas: [...rule.postIdeaTemplates]
    });
  });

  // Dynamic cluster for uncategorized hashtags
  const unmappedClusterId = 'general-insights';
  clustersMap.set(unmappedClusterId, {
    id: unmappedClusterId,
    title: 'General Insights & Observations',
    keywords: ['general', 'notes'],
    note_ids: [],
    future_post_ideas: [
      'Observations on daily founder conversations and customer onboarding speed.',
      'Diet, healthcare costs, and longevity awareness in high-stress tech roles.'
    ]
  });

  // Assign notes to clusters
  notes.forEach(note => {
    const textToMatch = `${note.content.body} ${note.content.hashtags.join(' ')} ${note.tags.join(' ')}`.toLowerCase();
    let assigned = false;

    for (const rule of DEFAULT_TOPIC_RULES) {
      const matchesKeyword = rule.keywords.some(kw => textToMatch.includes(kw));
      if (matchesKeyword) {
        clustersMap.get(rule.id)!.note_ids.push(note.id);
        note.topic_cluster = rule.id;
        assigned = true;
      }
    }

    if (!assigned) {
      clustersMap.get(unmappedClusterId)!.note_ids.push(note.id);
      note.topic_cluster = unmappedClusterId;
    }
  });

  return Array.from(clustersMap.values()).filter(c => c.note_ids.length > 0);
}

export function formatClusterSummary(clusters: TopicCluster[]): string {
  let output = `📊 SNAP Topic Management & Clusters (${clusters.length} clusters)\n`;
  output += `=======================================================\n\n`;

  clusters.forEach((cluster, index) => {
    output += `${index + 1}. 📂 ${cluster.title} [${cluster.id}]\n`;
    output += `   Notes in Cluster: ${cluster.note_ids.length}\n`;
    output += `   Keywords: ${cluster.keywords.join(', ')}\n`;
    output += `   💡 Future Note Ideas:\n`;
    cluster.future_post_ideas.forEach(idea => {
      output += `      - ${idea}\n`;
    });
    output += `\n`;
  });

  return output;
}
