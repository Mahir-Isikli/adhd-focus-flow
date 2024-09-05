import React from 'react';
import { Mic } from 'lucide-react';

interface VoiceInputViewProps {
  isRecording: boolean;
}

const VoiceInputView: React.FC<VoiceInputViewProps> = ({ isRecording }) => {
  if (!isRecording) return null;

  return (
    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
      <Mic className="w-5 h-5 text-red-500 animate-pulse" />
    </div>
  );
};

export default VoiceInputView;