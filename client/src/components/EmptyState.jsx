import React from 'react';

const EmptyState = ({ icon = '📦', title = 'No data found', message, action }) => {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h4 className="empty-title">{title}</h4>
      {message && <p className="empty-message">{message}</p>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
};

export default EmptyState;
