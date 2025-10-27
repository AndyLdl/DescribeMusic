/**
 * Analysis Result Viewer with Auth Context
 * Wraps AnalysisResultViewer with necessary providers
 */

import React from 'react';
import { AuthProvider } from '../../contexts/AuthContext';
import { CreditProvider } from '../../contexts/CreditContext';
import AnalysisResultViewer from './AnalysisResultViewer';

interface AnalysisResultViewerWithAuthProps {
  analysisId: string;
}

export default function AnalysisResultViewerWithAuth({ analysisId }: AnalysisResultViewerWithAuthProps) {
  return (
    <AuthProvider>
      <CreditProvider>
        <AnalysisResultViewer analysisId={analysisId} />
      </CreditProvider>
    </AuthProvider>
  );
}

