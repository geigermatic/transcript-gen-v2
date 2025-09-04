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
- [ ] **Task 1.1**: Design new 2/3 + 1/3 layout component structure
- [ ] **Task 1.2**: Implement responsive grid system (desktop only)
- [ ] **Task 1.3**: Migrate existing summary display to document view
- [ ] **Task 1.4**: Integrate chat panel in right column
- [ ] **Task 1.5**: Preserve all existing UI controls and metadata

### **UX-Phase-1B: Document State Management**
- [ ] **Task 2.1**: Implement document state management system
- [ ] **Task 2.2**: Build undo/redo stack with granular tracking
- [ ] **Task 2.3**: Create change detection and highlighting system
- [ ] **Task 2.4**: Integrate with existing version management
- [ ] **Task 2.5**: Add real-time content update pipeline

### **UX-Phase-1C: Chat-Document Integration**
- [ ] **Task 3.1**: Enhance chat engine for document editing commands
- [ ] **Task 3.2**: Implement chat → document update mechanism
- [ ] **Task 3.3**: Add edit validation and error handling
- [ ] **Task 3.4**: Create progress indicators for complex edits
- [ ] **Task 3.5**: Build change confirmation and feedback system

### **UX-Phase-1D: Change Visualization**
- [ ] **Task 4.1**: Design change highlighting system
- [ ] **Task 4.2**: Implement subtle animations for new changes
- [ ] **Task 4.3**: Add change details on hover/interaction
- [ ] **Task 4.4**: Create visual feedback for undo/redo operations
- [ ] **Task 4.5**: Optimize performance for large documents

### **UX-Phase-1E: Integration & Testing**
- [ ] **Task 5.1**: Comprehensive testing of all preserved features
- [ ] **Task 5.2**: Performance optimization and benchmarking
- [ ] **Task 5.3**: Error handling and edge case coverage
- [ ] **Task 5.4**: User acceptance testing and refinement
- [ ] **Task 5.5**: Documentation and deployment preparation

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
