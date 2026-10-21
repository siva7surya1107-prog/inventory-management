import React from 'react';

const Badge = ({ children, variant, status, className = '' }) => {
  let resolvedVariant = variant || 'default';

  // Automatically determine badge style based on status keywords if not explicitly provided
  if (!variant && status) {
    switch (status.toUpperCase()) {
      case 'IN_STOCK':
      case 'ACTIVE':
      case 'STOCK_IN':
        resolvedVariant = 'success';
        break;
      case 'LOW_STOCK':
      case 'EXPIRING_SOON':
      case 'TRANSFER':
        resolvedVariant = 'warning';
        break;
      case 'OUT_OF_STOCK':
      case 'EXPIRED':
      case 'INACTIVE':
      case 'STOCK_OUT':
        resolvedVariant = 'danger';
        break;
      default:
        resolvedVariant = 'primary';
    }
  }

  const displayText = children || (status ? status.replace(/_/g, ' ') : '');

  return (
    <span className={`badge badge-${resolvedVariant} ${className}`}>
      {displayText}
    </span>
  );
};

export default Badge;
