import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Define styles for the PDF document
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 30,
    paddingBottom: 20,
    borderBottom: '2pt solid #1e293b',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 4,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 12,
    paddingBottom: 6,
    borderBottom: '1pt solid #cbd5e1',
  },
  scoreBadge: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
  },
  overallScore: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0f172a',
    marginRight: 12,
  },
  scoreLabel: {
    fontSize: 14,
    color: '#475569',
    marginTop: 4,
  },
  parameterRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
  },
  parameterName: {
    fontSize: 12,
    color: '#1e293b',
    flex: 1,
  },
  parameterScore: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
    marginLeft: 12,
    width: 60,
    textAlign: 'right',
  },
  paragraph: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 1.6,
    marginBottom: 10,
  },
  bulletList: {
    marginLeft: 20,
    marginBottom: 10,
  },
  bulletItem: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 1.6,
    marginBottom: 6,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 20,
    marginBottom: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 9,
    color: '#94a3b8',
    borderTop: '1pt solid #e2e8f0',
    paddingTop: 10,
  },
});

// Helper function to get score color
const getScoreColor = (score) => {
  if (score >= 7) return '#059669'; // emerald
  if (score >= 4) return '#d97706'; // amber
  return '#f97316'; // coral
};

// Helper to format markdown-like text
const formatText = (text) => {
  if (!text) return '';
  // Simple markdown-like formatting
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markers
    .replace(/\*(.*?)\*/g, '$1') // Remove italic markers
    .replace(/^#+\s+(.*)$/gm, '$1') // Remove heading markers
    .replace(/^\s*[-*+]\s+(.*)$/gm, '• $1') // Convert lists
    .trim();
};

const ValidationReportPDF = ({ validation, overallScore, scores, parameterCards, recommendations, nextSteps, categoryAnswers, ideaExplanation }) => {
  const validationId = validation?.id || validation?.validation_id || 'N/A';
  const businessType = categoryAnswers?.business_archetype || categoryAnswers?.business_type || 'Not specified';
  const deliveryChannel = categoryAnswers?.delivery_channel || 'Not specified';
  
  // Get current date
  const reportDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Group parameters
  const parameterGroups = [
    {
      title: 'Market Viability',
      parameters: ['Market Opportunity', 'Target Audience Clarity', 'Go-to-Market Strategy'],
    },
    {
      title: 'Core Product & Moat',
      parameters: ['Problem-Solution Fit', 'Competitive Landscape', 'Technical Feasibility', 'Scalability Potential'],
    },
    {
      title: 'Execution & Risk',
      parameters: ['Business Model Viability', 'Financial Sustainability', 'Risk Assessment'],
    },
  ];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Idea Validation Report</Text>
          <Text style={styles.subtitle}>Validation ID: {validationId}</Text>
          <Text style={styles.subtitle}>Report Date: {reportDate}</Text>
          <Text style={styles.subtitle}>Business Type: {businessType}</Text>
          <Text style={styles.subtitle}>Delivery Channel: {deliveryChannel}</Text>
        </View>

        {/* Overall Score */}
        <View style={styles.section}>
          <View style={styles.scoreBadge}>
            <Text style={[styles.overallScore, { color: getScoreColor(overallScore) }]}>
              {overallScore.toFixed(1)}/10
            </Text>
            <View>
              <Text style={styles.scoreLabel}>Overall Score</Text>
              <Text style={[styles.scoreLabel, { fontSize: 10, color: '#64748b' }]}>
                {overallScore >= 7 ? 'Strong' : overallScore >= 4 ? 'Fair' : 'Needs Work'}
              </Text>
            </View>
          </View>
        </View>

        {/* Parameter Scores */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Validation Scores</Text>
          {parameterGroups.map((group) => (
            <View key={group.title}>
              <Text style={styles.groupTitle}>{group.title}</Text>
              {group.parameters.map((paramName) => {
                const card = parameterCards?.find(c => c.name === paramName);
                const score = card?.score || getScoreFromScores(scores, paramName) || 0;
                return (
                  <View key={paramName} style={styles.parameterRow}>
                    <Text style={styles.parameterName}>{paramName}</Text>
                    <Text style={[styles.parameterScore, { color: getScoreColor(score) }]}>
                      {score.toFixed(1)}/10
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        {/* Footer */}
        <Text style={styles.footer} fixed>
          Generated by Startup Idea Advisor • This report is confidential and intended for authorized use only
        </Text>
      </Page>

      {/* Recommendations Page */}
      {recommendations && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.title}>Detailed Analysis & Recommendations</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.paragraph}>
              {formatText(recommendations)}
            </Text>
          </View>

          <Text style={styles.footer} fixed>
            Page 2 of {nextSteps ? 3 : 2} • Startup Idea Advisor
          </Text>
        </Page>
      )}

      {/* Next Steps Page */}
      {nextSteps && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.title}>Next Steps & Action Plan</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.paragraph}>
              {formatText(nextSteps)}
            </Text>
          </View>

          <Text style={styles.footer} fixed>
            Page {nextSteps ? 3 : 2} of {nextSteps ? 3 : 2} • Startup Idea Advisor
          </Text>
        </Page>
      )}
    </Document>
  );
};

// Helper to get score from scores object
const getScoreFromScores = (scores = {}, parameter = "") => {
  if (!scores || !parameter) return 0;
  
  const normalized = parameter
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  
  const keyMap = {
    "market_opportunity": ["market_opportunity", "market_opportunity_score"],
    "problem_solution_fit": ["problem_solution_fit", "problem_solution_fit_score"],
    "competitive_landscape": ["competitive_landscape", "competitive_landscape_score"],
    "target_audience_clarity": ["target_audience_clarity", "target_audience_clarity_score"],
    "business_model_viability": ["business_model_viability", "business_model_viability_score"],
    "technical_feasibility": ["technical_feasibility", "technical_feasibility_score"],
    "financial_sustainability": ["financial_sustainability", "financial_sustainability_score"],
    "scalability_potential": ["scalability_potential", "scalability_potential_score"],
    "risk_assessment": ["risk_assessment", "risk_assessment_score"],
    "go_to_market_strategy": ["go_to_market_strategy", "go_to_market_strategy_score"],
  };
  
  const keys = keyMap[normalized] || [normalized];
  for (const key of keys) {
    if (scores[key] !== undefined) {
      return Number(scores[key]) ?? 0;
    }
  }
  return 0;
};

export default ValidationReportPDF;

