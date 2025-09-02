import { useAuth } from "@/contexts/AuthContext";
import { userService } from "@/lib/supabase";
import { useCallback } from "react";

export function useCredits() {
  const { user, updateUser } = useAuth();

  /**
   * Deduct credits from user account
   * @throws Error for unauthenticated users or insufficient credits
   */
  const deductCredits = useCallback(async (amount: number) => {
    if (!user) throw new Error("User not authenticated");
    if ((user.credits || 0) < amount) throw new Error("Insufficient credits");
    
    const newCredits = (user.credits || 0) - amount;
    const updatedUser = await userService.updateUser(user.id, { credits: newCredits });
    updateUser(updatedUser);
    return updatedUser;
  }, [user, updateUser]);

  /**
   * Add credits to user account
   */
  const addCredits = useCallback(async (amount: number) => {
    if (!user) throw new Error("User not authenticated");
    
    const newCredits = (user.credits || 0) + amount;
    const updatedUser = await userService.updateUser(user.id, { credits: newCredits });
    updateUser(updatedUser);
    return updatedUser;
  }, [user, updateUser]);

  /**
   * Check if user has sufficient credits
   */
  const hasSufficientCredits = useCallback((amount: number) => {
    if (!user) return false;
    return (user.credits || 0) >= amount;
  }, [user]);

  return {
    credits: user?.credits || 0,
    deductCredits,
    addCredits,
    hasSufficientCredits,
    user
  };
}
