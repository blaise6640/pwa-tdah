import React from "react";
import { Button } from "@mui/material";

const CustomButton = ({ children, ...props }) => {
  return (
    <Button
      variant="contained"
      color="primary"
      sx={{ borderRadius: 2, fontWeight: "bold", textTransform: "none", ...(props.sx || {}) }}
      {...props}
    >
      {children}
    </Button>
  );
};

export default CustomButton;
