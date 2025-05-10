import React from 'react';

interface StoryBeat {
  type: 'combat' | 'roleplay' | 'exploration' | 'scene';
  description: string;
  duration: string;
}

interface SessionPlan {
  title: string;
  summary: string;
  objectives: string[];
  storyBeats: StoryBeat[];
}

interface SessionPlanViewProps {
  sessionPlan: SessionPlan | null;
}

const SessionPlanView: React.FC<SessionPlanViewProps> = ({ sessionPlan }) => {
  if (!sessionPlan) {
    return (
      <div className="empty-plan">
        <p>No session plan available</p>
        <p>Create a new session plan using the generator</p>
      </div>
    );
  }

  return (
    <div className="session-plan-output">
      <div className="plan-header">
        <h3>{sessionPlan.title}</h3>
        <div className="plan-summary">{sessionPlan.summary}</div>
      </div>

      <div className="plan-section">
        <h4>Session Objectives</h4>
        <ul className="objectives-list">
          {sessionPlan.objectives.map((objective, index) => (
            <li key={index}>{objective}</li>
          ))}
        </ul>
      </div>

      <div className="plan-section">
        <h4>Story Beats</h4>
        <div className="story-beats">
          {sessionPlan.storyBeats.map((beat, index) => (
            <div key={index} className={`story-beat ${beat.type}`}>
              <div className="beat-type">{beat.type}</div>
              <div className="beat-description">{beat.description}</div>
              <div className="beat-duration">{beat.duration}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SessionPlanView; 