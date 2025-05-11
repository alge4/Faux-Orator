import React from 'react';
import './ModeSwitcher.css';

interface ModeSwitcherProps {
  modes: string[];
  activeMode: string;
  onModeChange: (mode: string) => void;
}

const ModeSwitcher: React.FC<ModeSwitcherProps> = ({ modes, activeMode, onModeChange }) => {
  return (
    <div className="mode-switcher">
      {modes.map((mode) => (
        <button
          key={mode}
          className={`mode-button ${activeMode === mode ? 'active' : ''}`}
          onClick={() => onModeChange(mode)}
        >
          {mode}
        </button>
      ))}
    </div>
  );
};

export default ModeSwitcher; 