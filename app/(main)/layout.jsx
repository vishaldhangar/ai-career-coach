import React from "react";
import { checkUser } from "@/lib/checkUser";
import PageTransition from "@/components/page-transition";

const MainLayout = async ({ children }) => {
  await checkUser();
  return (
    <div className="container mx-auto mt-24 mb-20">
      <PageTransition>{children}</PageTransition>
    </div>
  );
};

export default MainLayout;
