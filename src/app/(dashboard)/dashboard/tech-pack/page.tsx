import { Construction } from "lucide-react";

export default function TechPackPage() {
  return (
    <div className="flex flex-col items-center justify-center p-24 text-center">
      <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-6 animate-pulse">
        <Construction size={48} />
      </div>
      <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600 mb-3">Tech Pack Manager</h1>
      <p className="text-muted-foreground text-lg max-w-md">This module is under construction and will be deployed in a future release.</p>
    </div>
  );
}
