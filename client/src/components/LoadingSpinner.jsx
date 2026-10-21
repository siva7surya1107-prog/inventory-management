import React from 'react';

const LoadingSpinner = ({ size = 'md', text, className = '' }) => {
  return (
    <div className={`spinner-container ${className}`}>
      <div className={`spinner spinner-${size}`} role="status">
        <span className="sr-only">Loading...</span>
      </div>
      {text && <span className="spinner-text">{text}</span>}
    </div>
  );
};

export default LoadingSpinner;
