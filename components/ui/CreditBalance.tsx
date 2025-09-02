import { useCredits } from "@/hooks/useCredits";

export function CreditBalance() {
  const { credits } = useCredits();
  
  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm font-medium text-gray-700">Credits:</span>
      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-bold">
        {credits}
      </span>
    </div>
  );
}
