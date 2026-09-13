import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

interface PayButtonProps {
  onClick: (event: React.MouseEvent) => void;
  disabled?: boolean;
  tooltip?: string;
  size?: 'small' | 'medium' | 'large';
}

const PayButton: React.FC<PayButtonProps> = ({ onClick, disabled, tooltip = 'Encoder un paiement', size = 'small' }) => (
  <Tooltip title={tooltip}>
    <span>
      <IconButton
        size={size}
        color="primary"
        onClick={onClick}
        disabled={disabled}
      >
        <AddIcon fontSize={size === 'small' ? 'small' : 'medium'} />
      </IconButton>
    </span>
  </Tooltip>
);

export default PayButton;
