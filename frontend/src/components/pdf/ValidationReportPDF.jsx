import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Define styles for the PDF document
const styles = StyleSheet.create({
  page: {
    padding: 40,
    paddingBottom: 70, // Extra space for footer
    fontSize: 11,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottom: '2pt solid #1e293b',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 10,
    color: '#475569',
    marginBottom: 3,
  },
  section: {
    marginBottom: 20,
    marginTop: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 10,
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
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 6,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
  },
  parameterName: {
    fontSize: 11,
    color: '#1e293b',
    flex: 1,
  },
  parameterScore: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f172a',
    marginLeft: 12,
    width: 60,
    textAlign: 'right',
  },
  paragraph: {
    fontSize: 10,
    color: '#334155',
    lineHeight: 1.5,
    marginBottom: 8,
  },
  bulletList: {
    marginLeft: 15,
    marginBottom: 8,
  },
  bulletItem: {
    fontSize: 10,
    color: '#334155',
    lineHeight: 1.5,
    marginBottom: 4,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 15,
    marginBottom: 8,
  },
  inputRow: {
    display: 'flex',
    flexDirection: 'row',
    marginBottom: 6,
    paddingVertical: 4,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#475569',
    width: '40%',
  },
  inputValue: {
    fontSize: 10,
    color: '#1e293b',
    width: '60%',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#94a3b8',
    borderTop: '1pt solid #e2e8f0',
    paddingTop: 8,
  },
  pageNumber: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    fontSize: 8,
    color: '#94a3b8',
  },
});

// Helper function to get score color
const getScoreColor = (score) => {
  if (score >= 7) return '#059669'; // emerald
  if (score >= 4) return '#d97706'; // amber
  return '#f97316'; // coral
};

// Helper to format markdown-like text and split into paragraphs
const formatTextToParagraphs = (text) => {
  if (!text) return [];
  // Simple markdown-like formatting
  let formatted = text
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markers
    .replace(/\*(.*?)\*/g, '$1') // Remove italic markers
    .replace(/^#+\s+(.*)$/gm, '$1') // Remove heading markers
    .trim();
  
  // Split into paragraphs by double newlines or bullets
  return formatted
    .split(/\n\n+/)
    .filter(p => p.trim().length > 0)
    .map(p => p.trim());
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

// Format input field name for display
const formatFieldName = (key) => {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
};

const ValidationReportPDF = ({ 
  validation, 
  overallScore, 
  scores, 
  parameterCards, 
  recommendations, 
  nextSteps, 
  categoryAnswers, 
  ideaExplanation,
  userName,
  userEmail,
  finalConclusion
}) => {
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

  // Calculate total pages
  const recommendationParagraphs = recommendations ? formatTextToParagraphs(recommendations) : [];
  const nextStepsParagraphs = nextSteps ? formatTextToParagraphs(nextSteps) : [];
  const conclusionParagraphs = finalConclusion ? formatTextToParagraphs(finalConclusion) : [];
  
  let currentPage = 1;
  const totalPages = 1 + 
    (recommendationParagraphs.length > 0 ? 1 : 0) + 
    (nextStepsParagraphs.length > 0 ? 1 : 0) + 
    (conclusionParagraphs.length > 0 ? 1 : 0);

  const renderPageNumber = (pageNum) => (
    <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
      `${pageNumber} / ${totalPages}`
    )} fixed />
  );

  return (
    <Document>
      {/* Page 1: Header, User Info, Input Parameters, Overall Score, Parameter Scores */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Idea Validation Report</Text>
          {userName && <Text style={styles.subtitle}>Prepared for: {userName}</Text>}
          {userEmail && <Text style={styles.subtitle}>Email: {userEmail}</Text>}
          <Text style={styles.subtitle}>Validation ID: {validationId}</Text>
          <Text style={styles.subtitle}>Report Date: {reportDate}</Text>
        </View>

        {/* Input Parameters Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Input Parameters</Text>
          
          {businessType && businessType !== 'Not specified' && (
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Business Type:</Text>
              <Text style={styles.inputValue}>{businessType}</Text>
            </View>
          )}
          
          {deliveryChannel && deliveryChannel !== 'Not specified' && (
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Delivery Channel:</Text>
              <Text style={styles.inputValue}>{deliveryChannel}</Text>
            </View>
          )}
          
          {categoryAnswers && Object.keys(categoryAnswers).length > 0 && (
            <>
              {Object.entries(categoryAnswers).map(([key, value]) => {
                // Skip if already shown or empty
                if (key === 'business_archetype' || key === 'business_type' || key === 'delivery_channel' || !value) {
                  return null;
                }
                return (
                  <View key={key} style={styles.inputRow}>
                    <Text style={styles.inputLabel}>{formatFieldName(key)}:</Text>
                    <Text style={styles.inputValue}>{String(value)}</Text>
                  </View>
                );
              })}
            </>
          )}
          
          {ideaExplanation && (
            <View style={styles.section}>
              <Text style={[styles.inputLabel, { marginBottom: 6 }]}>Idea Description:</Text>
              <Text style={styles.paragraph}>{ideaExplanation}</Text>
            </View>
          )}
        </View>

        {/* Overall Score */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overall Validation Score</Text>
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
          <Text style={styles.sectionTitle}>Validation Scores by Parameter</Text>
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
        {renderPageNumber(1)}
      </Page>

      {/* Page 2: Detailed Analysis & Recommendations */}
      {recommendations && recommendationParagraphs.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.title}>Detailed Analysis & Recommendations</Text>
          </View>

          <View style={styles.section}>
            {recommendationParagraphs.map((para, idx) => (
              <Text key={idx} style={styles.paragraph}>
                {para}
              </Text>
            ))}
          </View>

          <Text style={styles.footer} fixed>
            Generated by Startup Idea Advisor • This report is confidential and intended for authorized use only
          </Text>
          {renderPageNumber(2)}
        </Page>
      )}

      {/* Page 3: Next Steps & Action Plan */}
      {nextSteps && nextStepsParagraphs.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.title}>Next Steps & Action Plan</Text>
          </View>

          <View style={styles.section}>
            {nextStepsParagraphs.map((para, idx) => (
              <Text key={idx} style={styles.paragraph}>
                {para}
              </Text>
            ))}
          </View>

          <Text style={styles.footer} fixed>
            Generated by Startup Idea Advisor • This report is confidential and intended for authorized use only
          </Text>
          {renderPageNumber(3)}
        </Page>
      )}

      {/* Page 4: Final Validation Conclusion (if available) */}
      {finalConclusion && conclusionParagraphs.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.title}>Final Validation Conclusion & Decision</Text>
          </View>

          <View style={styles.section}>
            {conclusionParagraphs.map((para, idx) => (
              <Text key={idx} style={styles.paragraph}>
                {para}
              </Text>
            ))}
          </View>

          <Text style={styles.footer} fixed>
            Generated by Startup Idea Advisor • This report is confidential and intended for authorized use only
          </Text>
          {renderPageNumber(4)}
        </Page>
      )}
    </Document>
  );
};

export default ValidationReportPDF;
