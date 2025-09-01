# PRD: Single View Editing with Undo/Redo

## Overview

Transform the current multi-version summary display into a single, unified summary view with intelligent undo/redo capabilities. This eliminates cognitive overhead from version management while providing users with confidence to make changes through familiar undo/redo patterns.

## Problem Statement

### Current State Issues
- **Cognitive Overload**: Users must mentally track multiple versions (V1, V2, V3) and compare between them
- **UI Complexity**: Version tabs, comparison views, and selection states create visual clutter
- **Unfamiliar UX**: Version management paradigm is foreign to most users
- **Decision Paralysis**: Users struggle to determine which version is "current" or "best"
- **Performance Impact**: Rendering multiple full summaries simultaneously

### User Pain Points
- "Which version should I be looking at?"
- "How do I get back to what I had before?"
- "I want to try something but I'm afraid I'll lose my current version"
- "This feels like Git, not like editing a document"

## Solution

### Single Summary View with Undo Stack
Replace version tabs with a single summary display backed by an intelligent undo/redo system that preserves all edit history while presenting a clean, focused interface.

## Success Metrics

### Primary KPIs
- **Reduced Time to Edit**: 50% faster from "view summary" to "make change"
- **Increased Edit Confidence**: 80% of users make edits without hesitation
- **Reduced Support Queries**: 70% fewer questions about "which version to use"

### Secondary KPIs
- **UI Simplification**: 60% reduction in UI elements on summary page
- **Performance Improvement**: 40% faster page load (single summary vs. multiple)
- **User Satisfaction**: 90%+ prefer single view in A/B testing

## User Stories

### Core User Stories
1. **As a user**, I want to see one clear summary so I can focus on content, not versions
2. **As a user**, I want to make changes with confidence knowing I can undo them
3. **As a user**, I want familiar undo/redo controls like every other editing tool
4. **As a user**, I want to see what changed when I undo/redo actions

### Advanced User Stories
1. **As a power user**, I want keyboard shortcuts (Cmd+Z, Cmd+Y) for undo/redo
2. **As a user**, I want to see a description of what each undo action will revert
3. **As a user**, I want to undo multiple steps quickly to get back to an earlier state

## Technical Requirements

### Data Model Changes
```typescript
interface SummaryEditState {
  // Current content (what user sees)
  currentContent: string;
  
  // Undo stack (previous states)
  undoStack: EditAction[];
  
  // Redo stack (undone actions that can be redone)
  redoStack: EditAction[];
  
  // Metadata
  documentId: string;
  lastModified: Date;
  totalEdits: number;
}

interface EditAction {
  id: string;
  type: 'chat_edit' | 'regeneration' | 'restoration';
  description: string; // "Removed second bullet point", "Made tone warmer"
  previousContent: string;
  newContent: string;
  timestamp: Date;
  metadata?: {
    chatQuery?: string;
    editType?: 'specific' | 'general';
    modelUsed?: string;
  };
}
```

### Storage Strategy
- **Primary Storage**: Current content + undo stack in browser localStorage
- **Backup Storage**: Periodic sync to server for persistence
- **Compression**: Use diff-based storage for large documents
- **Limits**: Maximum 50 undo actions (configurable)

### UI Components
1. **Single Summary Display**: Clean, focused content view
2. **Undo/Redo Buttons**: Prominent, always-visible controls
3. **Action Descriptions**: Hover tooltips showing what each undo will revert
4. **Keyboard Shortcuts**: Standard Cmd+Z/Cmd+Y support

## Implementation Plan

### Phase 1: Core Functionality (2 weeks)
- [ ] Implement undo stack data structure
- [ ] Create single summary view component
- [ ] Add basic undo/redo buttons
- [ ] Integrate with existing chat editing system

### Phase 2: Enhanced UX (1 week)
- [ ] Add action descriptions and tooltips
- [ ] Implement keyboard shortcuts
- [ ] Add visual feedback for undo/redo actions
- [ ] Performance optimization for large undo stacks

### Phase 3: Advanced Features (1 week)
- [ ] Undo history dropdown
- [ ] Smart undo grouping (combine rapid edits)
- [ ] Persistence and sync to server
- [ ] Analytics and usage tracking

## Design Specifications

### Layout Changes
- **Remove**: Version tabs, comparison views, version selectors
- **Add**: Single summary container with undo/redo controls
- **Simplify**: Clean, document-focused interface

### Undo/Redo Controls
- **Position**: Top-right of summary view, always visible
- **Style**: Subtle but discoverable, consistent with app design
- **States**: Disabled when no actions available, active otherwise
- **Feedback**: Brief animation/highlight when used

### Action Descriptions
- **Format**: "Undo: [description]" / "Redo: [description]"
- **Examples**: 
  - "Undo: Removed second bullet point"
  - "Undo: Made tone warmer and more compassionate"
  - "Undo: Regenerated entire summary"

## Migration Strategy

### Data Migration
1. **Convert existing versions** to undo stack format
2. **Set most recent version** as current content
3. **Preserve edit history** where possible
4. **Graceful fallback** for corrupted version data

### User Communication
- **In-app notification**: "We've simplified summary editing!"
- **Quick tutorial**: Show undo/redo buttons and keyboard shortcuts
- **Help documentation**: Update to reflect new workflow

## Risk Mitigation

### Technical Risks
- **Data Loss**: Comprehensive backup strategy and testing
- **Performance**: Efficient diff algorithms and stack management
- **Browser Compatibility**: Polyfills for localStorage and keyboard events

### UX Risks
- **User Confusion**: Clear onboarding and familiar patterns
- **Feature Discovery**: Prominent placement of undo/redo controls
- **Workflow Disruption**: Gradual rollout with feedback collection

## Success Criteria

### Must Have
- [ ] Single summary view replaces version tabs
- [ ] Functional undo/redo with accurate state restoration
- [ ] No data loss during migration
- [ ] Performance equal or better than current system

### Should Have
- [ ] Keyboard shortcuts working
- [ ] Action descriptions visible
- [ ] Smooth animations and feedback
- [ ] Server persistence of undo history

### Could Have
- [ ] Advanced undo history navigation
- [ ] Smart action grouping
- [ ] Cross-session undo persistence
- [ ] Analytics on undo/redo usage patterns

## Dependencies

### Internal
- Existing chat editing system integration
- Summary storage and retrieval APIs
- UI component library updates

### External
- Browser localStorage support
- Keyboard event handling
- Diff algorithm library (if needed)

## Timeline

**Total Duration**: 4 weeks

- **Week 1-2**: Core functionality and data model
- **Week 3**: Enhanced UX and keyboard shortcuts  
- **Week 4**: Advanced features and polish

**Launch Target**: End of current sprint + 4 weeks
