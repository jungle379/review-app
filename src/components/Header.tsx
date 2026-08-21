import { Box } from "@mantine/core";
import { FC } from "react";

const Header: FC = () => {
  return (
    <>
      <Box h={{ base: 50, sm: 200 }} my={{ base: 2, sm: 10 }} fz={{ base: 24, sm: 80 }} display="flex">
        Saving Planner
      </Box>
    </>
  );
};

export default Header;
