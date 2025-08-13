/**
 * A/B Summary Engine for generating and comparing different summary variants
 */

import { SummarizationEngine } from './summarizationEngine';
import { useAppStore } from '../store';
import type { 
  Document, 
  StyleGuide, 
  ABSummaryPair, 
  SummaryVariant,
  UserPreference
} from '../types';

export class ABSummaryEngine {
  /**
   * Generate A/B summary pair with two different variants
   */
  static async generateABSummaryPair(
    document: Document,
    baseStyleGuide: StyleGuide,
    onProgress?: (stage: string, current: number, total: number) => void
  ): Promise<ABSummaryPair> {
    const { addLog, addABSummaryPair } = useAppStore.getState();
    const startTime = Date.now();
    
    addLog({
      level: 'info',
      category: 'ab-testing',
      message: `Starting A/B summary generation for document: ${document.title}`,
      details: { documentId: document.id, documentTitle: document.title }
    });

    try {
      // Define the two variants
      const variantA = this.createVariantA(baseStyleGuide);
      const variantB = this.createVariantB(baseStyleGuide);

      // Generate summary A
      onProgress?.('Generating Summary A', 1, 3);
      addLog({
        level: 'debug',
        category: 'ab-testing',
        message: `Generating Summary A: ${variantA.name}`,
        details: { variant: variantA }
      });

      const summaryA = await SummarizationEngine.summarizeDocument(
        document,
        this.mergeStyleGuide(baseStyleGuide, variantA.styleModifications),
        (current, total) => onProgress?.(`Summary A (${variantA.name})`, current, total)
      );

      // Small delay between generations
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Generate summary B
      onProgress?.('Generating Summary B', 2, 3);
      addLog({
        level: 'debug',
        category: 'ab-testing',
        message: `Generating Summary B: ${variantB.name}`,
        details: { variant: variantB }
      });

      const summaryB = await SummarizationEngine.summarizeDocument(
        document,
        this.mergeStyleGuide(baseStyleGuide, variantB.styleModifications),
        (current, total) => onProgress?.(`Summary B (${variantB.name})`, current, total)
      );

      // Create the A/B pair
      onProgress?.('Finalizing A/B Pair', 3, 3);
      const abPair: ABSummaryPair = {
        id: crypto.randomUUID(),
        documentId: document.id,
        documentTitle: document.title,
        summaryA,
        summaryB,
        variantDetails: {
          variantA,
          variantB,
        },
        createdAt: new Date().toISOString(),
      };

      // Store the pair
      addABSummaryPair(abPair);

      const processingTime = Date.now() - startTime;
      addLog({
        level: 'info',
        category: 'ab-testing',
        message: `A/B summary pair generated successfully`,
        details: {
          documentId: document.id,
          pairId: abPair.id,
          processingTime,
          variantA: variantA.name,
          variantB: variantB.name,
          summaryALength: summaryA.markdownSummary.length,
          summaryBLength: summaryB.markdownSummary.length,
        }
      });

      return abPair;

    } catch (error) {
      addLog({
        level: 'error',
        category: 'ab-testing',
        message: `A/B summary generation failed for document: ${document.title}`,
        details: { 
          documentId: document.id, 
          error: error instanceof Error ? error.message : error 
        }
      });
      throw error;
    }
  }

  /**
   * Record user feedback for an A/B test
   */
  static recordFeedback(
    pairId: string,
    winner: 'A' | 'B',
    reason?: string
  ): void {
    const { updateABSummaryFeedback, addPreference, addLog } = useAppStore.getState();

    const feedback: UserPreference = {
      id: crypto.randomUUID(),
      document_id: pairId, // Using pairId as the document reference for A/B testing
      candidateA: 'Variant A Summary',
      candidateB: 'Variant B Summary',
      winner,
      reason,
      created_at: new Date().toISOString(),
    };

    // Update the A/B pair with feedback
    updateABSummaryFeedback(pairId, feedback);
    
    // Also add to general preferences for analytics
    addPreference(feedback);

    addLog({
      level: 'info',
      category: 'ab-testing',
      message: `User feedback recorded for A/B test`,
      details: {
        pairId,
        winner,
        reason: reason || 'No reason provided',
        feedbackId: feedback.id,
      }
    });
  }

  /**
   * Create Variant A: More formal and structured
   */
  private static createVariantA(baseStyleGuide: StyleGuide): SummaryVariant {
    return {
      name: 'Professional & Structured',
      description: 'More formal tone with clear structure and bullet points',
      styleModifications: {
        tone_settings: {
          formality: Math.min(100, baseStyleGuide.tone_settings.formality + 20),
          enthusiasm: Math.max(0, baseStyleGuide.tone_settings.enthusiasm - 10),
          technicality: baseStyleGuide.tone_settings.technicality,
        },
        example_phrases: {
          preferred_openings: [
            'This document presents',
            'The key findings include',
            'Analysis reveals',
            'The structured approach demonstrates',
          ],
          preferred_transitions: [
            'Furthermore',
            'Additionally',
            'In conclusion',
            'Building upon this',
          ],
          preferred_conclusions: [
            'In summary',
            'The analysis demonstrates',
            'These findings indicate',
            'To conclude',
          ],
          avoid_phrases: [
            'Awesome',
            'Super cool',
            'Amazing',
            'Totally',
          ],
        },
      },
      promptStrategy: 'structured_formal',
    };
  }

  /**
   * Create Variant B: More conversational and engaging
   */
  private static createVariantB(baseStyleGuide: StyleGuide): SummaryVariant {
    return {
      name: 'Conversational & Engaging',
      description: 'More casual tone with engaging language and storytelling elements',
      styleModifications: {
        tone_settings: {
          formality: Math.max(0, baseStyleGuide.tone_settings.formality - 20),
          enthusiasm: Math.min(100, baseStyleGuide.tone_settings.enthusiasm + 15),
          technicality: Math.max(0, baseStyleGuide.tone_settings.technicality - 10),
        },
        example_phrases: {
          preferred_openings: [
            'Let\'s dive into',
            'Here\'s what we discovered',
            'You\'ll find that',
            'What\'s interesting is',
          ],
          preferred_transitions: [
            'What\'s more',
            'Here\'s the thing',
            'That said',
            'Moving on',
          ],
          preferred_conclusions: [
            'Bottom line',
            'The takeaway here',
            'What this means for you',
            'Here\'s what matters',
          ],
          avoid_phrases: [
            'Pursuant to',
            'Heretofore',
            'Aforementioned',
            'Subsequently',
          ],
        },
      },
      promptStrategy: 'conversational_engaging',
    };
  }

  /**
   * Merge base style guide with variant modifications
   */
  private static mergeStyleGuide(
    baseStyleGuide: StyleGuide,
    modifications: Partial<StyleGuide>
  ): StyleGuide {
    return {
      ...baseStyleGuide,
      ...modifications,
      tone_settings: {
        ...baseStyleGuide.tone_settings,
        ...modifications.tone_settings,
      },
      example_phrases: {
        ...baseStyleGuide.example_phrases,
        ...modifications.example_phrases,
      },
    };
  }

  /**
   * Get A/B testing statistics
   */
  static getABTestingStats(): {
    totalTests: number;
    completedTests: number;
    variantAWins: number;
    variantBWins: number;
    completionRate: number;
  } {
    const { abSummaryPairs } = useAppStore.getState();
    
    const totalTests = abSummaryPairs.length;
    const completedTests = abSummaryPairs.filter(pair => pair.userFeedback).length;
    const variantAWins = abSummaryPairs.filter(pair => pair.userFeedback?.winner === 'A').length;
    const variantBWins = abSummaryPairs.filter(pair => pair.userFeedback?.winner === 'B').length;
    const completionRate = totalTests > 0 ? (completedTests / totalTests) * 100 : 0;

    return {
      totalTests,
      completedTests,
      variantAWins,
      variantBWins,
      completionRate: Math.round(completionRate * 100) / 100,
    };
  }
}
