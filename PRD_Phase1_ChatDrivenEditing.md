# PRD: UX-Phase-1 - Chat-Driven Document Editing MVP

## 🎯 **Executive Summary**

Transform the summary view into a collaborative document editing interface where users can modify summaries through natural language chat commands while preserving all existing functionality.

**Core Innovation**: 2/3 document view + 1/3 chat interface with real-time document updates, undo/redo capability, and change highlighting.

**Scope**: Local Mac desktop application only. No mobile, multi-user, or cloud considerations.

**Integration**: Seamless integration with existing test dashboard at `/tests` using established TDD API architecture.

---

## 📋 **Current State Preservation Requirements**

### **✅ Must Retain All Existing Features**
- **Tabbed View**: Raw vs Styled summary tabs
- **Version Management**: Compare versions, version history, restore previous versions
- **Regeneration**: Full summary regeneration capability
- **Metadata Display**: Processing stats, model info, timestamps
- **Copy Functionality**: Copy summary content to clipboard
- **Navigation**: Back to main view, document selection
- **Progress Indicators**: For regeneration and processing
- **Error Handling**: Graceful failure states

---

## 🎨 **New UX Design Specification**

### **Layout Architecture**
```
┌─────────────────────────────────────────────────────────────────┐
│ [← Back] Document Title                                         │
├─────────────────────────────────────────────────────────────────┤
│                    │                                            │
│   DOCUMENT VIEW    │           CHAT PANEL                      │
│      (2/3)         │            (1/3)                          │
│                    │                                            │
│ ┌─[Raw][Styled]─┐  │ ┌─────────────────────────────────────────┐ │
│ │               │  │ │ Chat History                            │ │
│ │   Summary     │  │ │ ┌─────────────────────────────────────┐ │ │
│ │   Content     │  │ │ │ User: Change bullet points to      │ │ │
│ │   (Editable   │  │ │ │ numbered list                       │ │ │
│ │   via Chat)   │  │ │ └─────────────────────────────────────┘ │ │
│ │               │  │ │ ┌─────────────────────────────────────┐ │ │
│ │               │  │ │ │ AI: ✅ Updated! Changed 3 bullet   │ │ │
│ │               │  │ │ │ points to numbered list             │ │ │
│ │               │  │ │ └─────────────────────────────────────┘ │ │
│ └───────────────┘  │ │                                         │ │
│                    │ │                                         │ │
│ [Compare][Regen]   │ │                                         │ │
│ [Copy][Undo/Redo]  │ │ ┌─────────────────────────────────────┐ │ │
│ Metadata: 1.2k     │ │ │ Type your editing request...        │ │ │
│ words, v3, GPT-4   │ │ └─────────────────────────────────────┘ │ │
│                    │ │ [Send] [Undo] [Redo]                   │ │
│                    │ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### **Key UX Principles**
1. **Document is Primary**: 2/3 space for content, chat is secondary
2. **Real-time Updates**: Changes appear immediately in document view
3. **Visual Feedback**: Highlight changes with subtle animation
4. **Preserve Context**: All existing controls remain accessible
5. **Undo Confidence**: Clear undo/redo with change preview

---

## 🔧 **Technical Requirements**

### **Core Functionality**
1. **Layout Management**
   - Responsive 2/3 + 1/3 split (desktop sizes only)
   - Collapsible chat panel option
   - Maintain existing header and navigation

2. **Document State Management**
   - Real-time content updates from chat commands
   - Granular undo/redo stack (per chat interaction)
   - Change tracking and highlighting
   - Version history integration

3. **Chat Integration**
   - Enhanced chat engine for document editing
   - Command detection and processing
   - Error handling and validation
   - Progress indicators for complex edits

4. **Change Visualization**
   - Subtle highlighting of modified content
   - Animation for new changes
   - Optional change details on hover/click

### **Preserved Functionality Integration**
- **Tabs**: Raw/Styled tabs work within document view
- **Version Compare**: Modal or side-by-side comparison
- **Regeneration**: Full regeneration with progress tracking
- **Copy**: Copy current document state
- **Metadata**: Display in document view footer/sidebar

---

## 🧪 **TDD Implementation Strategy**

### **Test Categories**

#### **1. Layout & UI Tests**
- 2/3 + 1/3 responsive behavior (desktop only)
- Chat panel collapse/expand
- Tab switching within document view
- Modal overlays for version comparison

#### **2. Document State Management Tests**
- Real-time content updates from chat
- Undo/redo stack operations
- Change tracking accuracy
- State persistence across tab switches

#### **3. Chat-Document Integration Tests**
- Chat command → document update pipeline
- Error handling and rollback
- Progress indication for long operations
- Validation of edit accuracy

#### **4. Preserved Functionality Tests**
- All existing features work in new layout
- Version management integration
- Copy functionality with new state
- Regeneration with layout preservation

#### **5. Change Visualization Tests**
- Highlighting appears correctly
- Animation timing and smoothness
- Change details display
- Visual feedback for undo/redo

---

## 📊 **Success Metrics**

### **Technical Metrics**
- **Edit Accuracy**: >95% of chat commands produce expected changes
- **Performance**: <500ms for simple edits, <2s for complex edits
- **Reliability**: <1% error rate for supported commands
- **Undo/Redo**: 100% accuracy in state restoration

### **User Experience Metrics**
- **Feature Retention**: All existing features accessible and functional
- **Layout Usability**: Effective use of 2/3 + 1/3 space
- **Change Clarity**: Users understand what changed and why
- **Confidence**: Users comfortable using undo/redo

---

## 📋 **Implementation Task List**

### **UX-Phase-1A: Layout Foundation**
**🧪 TDD Acceptance Criteria:**
- [ ] **AC-1A.1**: Create failing tests for 2/3 + 1/3 layout behavior BEFORE implementation
- [ ] **AC-1A.2**: All UX-Phase-1A tests must pass (estimated 12 tests)
- [ ] **AC-1A.3**: Update PRD with any approach changes during implementation
- [ ] **AC-1A.4**: Test dashboard shows UX-Phase-1A completion status

**📋 Implementation Tasks:**
- [ ] **Task 1.1**: Write failing tests for 2/3 + 1/3 layout component structure
- [ ] **Task 1.2**: Write failing tests for responsive grid system (desktop only)
- [ ] **Task 1.3**: Write failing tests for existing summary display migration
- [ ] **Task 1.4**: Write failing tests for chat panel integration
- [ ] **Task 1.5**: Write failing tests for UI controls preservation
- [ ] **Task 1.6**: Implement layout foundation to make tests pass
- [ ] **Task 1.7**: Update PRD with implementation learnings

### **UX-Phase-1B: Document State Management**
**🧪 TDD Acceptance Criteria:**
- [ ] **AC-1B.1**: Create failing tests for document state management BEFORE implementation
- [ ] **AC-1B.2**: All UX-Phase-1B tests must pass (estimated 15 tests)
- [ ] **AC-1B.3**: Update PRD with any approach changes during implementation
- [ ] **AC-1B.4**: Test dashboard shows UX-Phase-1B completion status

**📋 Implementation Tasks:**
- [ ] **Task 2.1**: Write failing tests for document state management system
- [ ] **Task 2.2**: Write failing tests for undo/redo stack with granular tracking
- [ ] **Task 2.3**: Write failing tests for change detection and highlighting system
- [ ] **Task 2.4**: Write failing tests for existing version management integration
- [ ] **Task 2.5**: Write failing tests for real-time content update pipeline
- [ ] **Task 2.6**: Implement document state management to make tests pass
- [ ] **Task 2.7**: Update PRD with implementation learnings

### **UX-Phase-1C: Chat-Document Integration**
**🧪 TDD Acceptance Criteria:**
- [ ] **AC-1C.1**: Create failing tests for chat-document integration BEFORE implementation
- [ ] **AC-1C.2**: All UX-Phase-1C tests must pass (estimated 18 tests)
- [ ] **AC-1C.3**: Update PRD with any approach changes during implementation
- [ ] **AC-1C.4**: Test dashboard shows UX-Phase-1C completion status

**📋 Implementation Tasks:**
- [ ] **Task 3.1**: Write failing tests for enhanced chat engine document editing commands
- [ ] **Task 3.2**: Write failing tests for chat → document update mechanism
- [ ] **Task 3.3**: Write failing tests for edit validation and error handling
- [ ] **Task 3.4**: Write failing tests for progress indicators for complex edits
- [ ] **Task 3.5**: Write failing tests for change confirmation and feedback system
- [ ] **Task 3.6**: Implement chat-document integration to make tests pass
- [ ] **Task 3.7**: Update PRD with implementation learnings

### **UX-Phase-1D: Change Visualization**
**🧪 TDD Acceptance Criteria:**
- [ ] **AC-1D.1**: Create failing tests for change visualization BEFORE implementation
- [ ] **AC-1D.2**: All UX-Phase-1D tests must pass (estimated 10 tests)
- [ ] **AC-1D.3**: Update PRD with any approach changes during implementation
- [ ] **AC-1D.4**: Test dashboard shows UX-Phase-1D completion status

**📋 Implementation Tasks:**
- [ ] **Task 4.1**: Write failing tests for change highlighting system
- [ ] **Task 4.2**: Write failing tests for subtle animations for new changes
- [ ] **Task 4.3**: Write failing tests for change details on hover/interaction
- [ ] **Task 4.4**: Write failing tests for visual feedback for undo/redo operations
- [ ] **Task 4.5**: Write failing tests for performance optimization for large documents
- [ ] **Task 4.6**: Implement change visualization to make tests pass
- [ ] **Task 4.7**: Update PRD with implementation learnings

### **UX-Phase-1E: Integration & Testing**
**🧪 TDD Acceptance Criteria:**
- [ ] **AC-1E.1**: Create failing tests for integration scenarios BEFORE implementation
- [ ] **AC-1E.2**: All UX-Phase-1E tests must pass (estimated 8 tests)
- [ ] **AC-1E.3**: ALL previous UX-Phase tests (1A-1D) must continue to pass
- [ ] **AC-1E.4**: Update PRD with final implementation summary
- [ ] **AC-1E.5**: Test dashboard shows 100% UX-Phase-1 completion

**📋 Implementation Tasks:**
- [ ] **Task 5.1**: Write failing tests for comprehensive preserved feature testing
- [ ] **Task 5.2**: Write failing tests for performance benchmarks
- [ ] **Task 5.3**: Write failing tests for error handling and edge cases
- [ ] **Task 5.4**: Write failing tests for user acceptance scenarios
- [ ] **Task 5.5**: Implement final integration to make all tests pass
- [ ] **Task 5.6**: Update PRD with final implementation summary and lessons learned

---

## 🎯 **Definition of Done**

### **Core Functionality**
- ✅ 2/3 + 1/3 layout working on desktop
- ✅ Real-time document updates from chat
- ✅ Undo/redo with change highlighting
- ✅ All existing features preserved and accessible

### **Quality Standards**
- ✅ >95% test coverage for new functionality
- ✅ All existing tests continue to pass
- ✅ Performance benchmarks met
- ✅ Error handling comprehensive

### **User Experience**
- ✅ Intuitive chat-driven editing workflow
- ✅ Clear visual feedback for all changes
- ✅ Confident undo/redo experience
- ✅ Seamless integration with existing features

---

## 🧪 **Test Dashboard Integration**

### **Naming Convention**
- **Architecture Phases**: Existing Phase 1-8 (Vector DB, Performance, etc.)
- **UX Development**: New UX-Phase-1A through UX-Phase-1E

### **Test File Structure**
```
src/lib/__tests__/ux-phase-1a-layout-foundation.test.ts
src/lib/__tests__/ux-phase-1b-document-state.test.ts
src/lib/__tests__/ux-phase-1c-chat-integration.test.ts
src/lib/__tests__/ux-phase-1d-change-visualization.test.ts
src/lib/__tests__/ux-phase-1e-integration-testing.test.ts
```

### **Dashboard Display Structure**
```
ARCHITECTURE PHASES (Current - Preserve)
✅ Phase 1: Vector Database Foundation (32/32)
✅ Phase 2: Advanced Vector Features (67/67)
✅ Phase 3: Vector Database Integration (59/59)
✅ Phase 4: Performance Optimization (23/23)
✅ Phase 5: Production Integration (11/11)
🔄 Phase 6: Advanced AI & UX Features (0/55)
🔄 Phase 7: Advanced Performance Features (0/25)
🔄 Phase 8: Enterprise Production Features (0/41)

UX DEVELOPMENT PHASES (New - Add)
🔄 UX-Phase-1A: Layout Foundation (0/12)
🔄 UX-Phase-1B: Document State Management (0/15)
🔄 UX-Phase-1C: Chat-Document Integration (0/18)
🔄 UX-Phase-1D: Change Visualization (0/10)
🔄 UX-Phase-1E: Integration & Testing (0/8)
```

### **Required Updates**
1. **Parser Updates** (`server/vitest-parser.ts`)
   - Add UX-Phase detection patterns
   - Separate UX-Phase from Architecture Phase counting
   - Update phase definitions

2. **Dashboard Updates** (`TestApiDashboard.tsx`)
   - Add UX-Phase section with clear visual separation
   - Maintain existing Architecture Phase display
   - Real-time progress tracking for both categories

3. **API Integration**
   - Extend existing test API to handle UX-Phase categorization
   - Maintain backward compatibility with current architecture phases
   - Real-time test status updates for UX development progress

---

## 🚀 **Future UX-Phases (Post-MVP)**

**UX-Phase-2**: AI-observed manual editing with intelligent suggestions
**UX-Phase-3**: Advanced change management and batch operations
**UX-Phase-4**: Multi-document workspace and cross-document editing
**UX-Phase-5**: Export capabilities and sharing features
**UX-Phase-6**: Mobile adaptation and responsive design

---

*This PRD focuses exclusively on local Mac desktop implementation with no mobile, multi-user, or cloud considerations for UX-Phase-1 MVP. Integration with existing test dashboard ensures seamless TDD development workflow.*
