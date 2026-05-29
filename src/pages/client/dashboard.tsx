import { useEffect } from "react";

import { AssignedStaffSection } from "../../components/AssignedStaffSection";

export const UserHomePage = () => {
  useEffect(() => {
    document.title = "Home";
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <AssignedStaffSection />
    </div>
  );
};
