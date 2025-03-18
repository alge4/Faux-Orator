import React from 'react';
import { SvgIcon, SvgIconProps } from '@mui/material';

export const MicrosoftLogo = (props: SvgIconProps) => {
  return (
    <SvgIcon {...props} viewBox="0 0 23 23">
      <path fill="#f1511b" d="M11.5 0h-11v11h11V0z" />
      <path fill="#80cc28" d="M23 0h-11v11h11V0z" />
      <path fill="#00adef" d="M11.5 11.5h-11v11h11V11.5z" />
      <path fill="#fbbc09" d="M23 11.5h-11v11h11V11.5z" />
    </SvgIcon>
  );
}; 