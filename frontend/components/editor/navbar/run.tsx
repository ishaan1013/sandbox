"use client";

import { Play, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTerminal } from "@/context/TerminalContext";
import { usePreview } from "@/context/PreviewContext";
import { toast } from "sonner";

export default function RunButtonModal({
  isRunning,
  setIsRunning,
}: {
  isRunning: boolean;
  setIsRunning: (running: boolean) => void;
}) {
  const { createNewTerminal, terminals, closeTerminal } = useTerminal();
  const { setIsPreviewCollapsed, previewPanelRef} = usePreview();

  const handleRun = () => {
    if (isRunning) {
      console.log('Stopping sandbox...');
      console.log('Closing Preview Window');

      terminals.forEach(term => {
        if (term.terminal) {
          closeTerminal(term.id);
          console.log('Closing Terminal', term.id);
        }
      });

      setIsPreviewCollapsed(true);
      previewPanelRef.current?.collapse();
    } else {
      console.log('Running sandbox...');
      console.log('Opening Terminal');
      console.log('Opening Preview Window');

      if (terminals.length < 4) {
        createNewTerminal();
      } else {
        toast.error("You reached the maximum # of terminals.");
        console.error('Maximum number of terminals reached.');
      }

      setIsPreviewCollapsed(false);
      previewPanelRef.current?.expand();
    }
    setIsRunning(!isRunning);
  };

  return (
    <>
      <Button variant="outline" onClick={handleRun}>
        {isRunning ? <StopCircle className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
        {isRunning ? 'Stop' : 'Run'}
      </Button>
    </>
  );
}