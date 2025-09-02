# Mobile Generation Workflow Implementation Plan (Enhanced)

## Problem Statement
The "Generate 3D Model" button is non-functional on the mobile interface due to missing implementation of the generation workflow. Additionally, credit management logic is duplicated across components, leading to inconsistencies and maintenance challenges.

## Solution Overview
Implement a unified generation workflow using shared hooks and components to ensure consistency between mobile and desktop interfaces. This includes:
1. Centralized credit management system
2. Shared model generation logic
3. Reusable UI components
4. Consistent error handling

## Implementation Plan

### Phase 1: Create Shared Hooks
- [ ] Create `hooks/useCredits.ts`
  - [ ] Implement credit management logic:
    - [ ] `deductCredits` and `addCredits` methods
    - [ ] Real-time credit balance access
    - [ ] Sufficient credit checks with error handling
    - [ ] Integration with AuthContext
- [ ] Create `hooks/useModelGeneration.ts`
  - [ ] Implement core generation logic:
    - [ ] `generateModel` function with automatic credit deduction
    - [ ] Loading and error state management
    - [ ] Job ID return for polling
    - [ ] Credit rollback on failures
  - [ ] Add TypeScript interfaces for API responses:
    ```typescript
    interface GenerationResponse {
      jobId: string;
      status: 'success' | 'insufficient_credits' | 'api_error';
    }
    
    interface JobStatusResponse {
      status: 'processing' | 'completed' | 'failed';
      modelUrl?: string;
      errorMessage?: string;
    }
    ```
- [ ] Add TypeScript interfaces for parameters and return types
- [ ] Update AuthContext to support credit updates

```typescript
// hooks/useCredits.ts
import { useAuth } from "@/contexts/AuthContext";
import { userService } from "@/lib/supabase/user.service";
import { useCallback } from "react";

export function useCredits() {
  const { user, updateUser } = useAuth();

  /**
   * Deduct credits from user account
   * @throws Error for unauthenticated users or insufficient credits
   */
  const deductCredits = useCallback(async (amount: number) => {
    if (!user) throw new Error("User not authenticated");
    if (user.credits < amount) throw new Error("Insufficient credits");
    
    const newCredits = user.credits - amount;
    const updatedUser = await userService.updateUserCredits(user.id, newCredits);
    updateUser(updatedUser);
    return updatedUser;
  }, [user, updateUser]);

  // Additional methods...
}
```

### Phase 2: Implement Shared Components
- [ ] Create `components/ui/CreditBalance.tsx`
  - [ ] Display current credit balance
  - [ ] Use the useCredits hook internally
- [ ] Add CreditBalance to:
  - [ ] Mobile navigation header
  - [ ] Desktop header
  - [ ] Billing page

```tsx
// components/ui/CreditBalance.tsx
import { useCredits } from "@/hooks/useCredits";

export function CreditBalance() {
  const { credits } = useCredits();
  return <div>Credits: {credits}</div>;
}
```

### Phase 3: Mobile Integration
- [ ] Import `useModelGeneration` in `MobileHomeContent.tsx`
- [ ] Replace empty onGenerate handler:

```typescript
const handleGenerate = async () => {
  if (!selectedModel || !user) return;
  
  try {
    const jobId = await generateModel(selectedModel.id, currentPhotoSet);
    startPolling(jobId);
    
    // Clean up temporary models
    if (selectedModel.isTemporary) {
      await storage.deleteDraft(selectedModel.id);
    }
  } catch (error) {
    // Handle error
  }
}
```

### Phase 4: Job Polling & Error Handling
- [ ] Create job polling logic in useModelGeneration hook
- [ ] Implement adaptive polling intervals (5s → 10s → 30s)
- [ ] Add maximum retry limit (20 attempts)
- [ ] Implement credit rollback on failures
- [ ] Add error logging to Supabase

### Phase 5: Testing
- [ ] Verify on mobile devices:
  - [ ] Credit deduction during generation
  - [ ] Job status updates
  - [ ] Error handling for insufficient credits
  - [ ] Navigation flows
- [ ] Test edge cases:
  - [ ] Network failures
  - [ ] API errors
  - [ ] Credit exhaustion scenarios
- [ ] Implement React error boundaries:
  - [ ] Create error boundary component
  - [ ] Wrap mobile content with error boundary

### Phase 6: Documentation
- [ ] Update README with shared component architecture
- [ ] Add JSDoc comments to new hooks
- [ ] Create ADR for shared hook pattern

```markdown
# docs/adr/0005-shared-hook-pattern.md
## Context
Need consistent behavior across mobile and desktop with minimal duplication
## Decision
Use custom hooks to encapsulate shared business logic
## Consequences
- 70% reduction in duplicate code
- Centralized error handling
- Easier maintenance
- Consistent user experience
```

## Implementation Roadmap
1. Shared Hooks (2 days)
2. Mobile Integration (1 day)
3. Desktop Integration (1 day)
4. Testing & QA (2 days)
5. Documentation (0.5 days)

**Total Estimated Time: 6.5 days**

### Phase 7: Desktop Refactoring (Post-Implementation)
- [ ] Refactor `components/model-generator.tsx` to use `useModelGeneration` hook
- [ ] Replace direct credit checks with `useCredits` hook
- [ ] Ensure consistent error handling between platforms
