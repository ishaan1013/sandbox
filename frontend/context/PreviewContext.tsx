"use client"

import React, { createContext, useContext, useState, useRef } from 'react';
import { ImperativePanelHandle } from "react-resizable-panels";

interface PreviewContextType {
  isPreviewCollapsed: boolean;
  setIsPreviewCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  previewURL: string;
  setPreviewURL: React.Dispatch<React.SetStateAction<string>>;
  previewPanelRef: React.RefObject<ImperativePanelHandle>;
}

const PreviewContext = createContext<PreviewContextType | undefined>(undefined);

export const PreviewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPreviewCollapsed, setIsPreviewCollapsed] = useState(true);
  const [previewURL, setPreviewURL] = useState<string>("");
  const previewPanelRef = useRef<ImperativePanelHandle>(null);

  return (
    <PreviewContext.Provider value={{ isPreviewCollapsed, setIsPreviewCollapsed, previewURL, setPreviewURL, previewPanelRef }}>
      {children}
    </PreviewContext.Provider>
  );
};

export const usePreview = () => {
  const context = useContext(PreviewContext);
  if (context === undefined) {
    throw new Error('usePreview must be used within a PreviewProvider');
  }
  return context;
};